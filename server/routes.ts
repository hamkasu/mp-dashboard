import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { z } from "zod";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import { getPublicBaseUrl, buildPdfUrl, fixHansardPdfUrls } from "./utils/url-helper";
import { 
  insertCourtCaseSchema, 
  insertSprmInvestigationSchema, 
  updateSprmInvestigationSchema,
  insertLegislativeProposalSchema,
  insertDebateParticipationSchema,
  insertParliamentaryQuestionSchema,
  insertHansardRecordSchema,
  updateHansardRecordSchema,
  mps,
  hansardPdfFiles,
  hansardRecords,
  unmatchedSpeakers,
  insertUnmatchedSpeakerSchema,
  speakerMappings,
  insertSpeakerMappingSchema
} from "@shared/schema";
import crypto from "crypto";
import { HansardScraper, ConstituencyAttendanceCounts } from "./hansard-scraper";
import { MPNameMatcher } from "./mp-name-matcher";
import { runHansardSync } from "./hansard-cron";
import { HansardPdfParser } from "./hansard-pdf-parser";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { jobTracker } from "./job-tracker";
import { runHansardDownloadJob } from "./hansard-background-jobs";
// Reference: blueprint:javascript_auth_all_persistance
import { setupAuth, requireAuth } from "./auth";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 25, // Max 25 files per request (balanced for 24-file uploads while managing memory)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed.`));
    }
  },
});

// Multer error handling middleware
function handleMulterError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 25 files per upload. Please upload in batches.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field. Make sure you are uploading to the correct field name.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'Invalid file type. Only PDF files are allowed.' });
  }
  next();
}

function extractTopics(transcript: string): string[] {
  const topics: Set<string> = new Set();
  
  const commonTopics = [
    'Bajet', 'Budget', 'Rang Undang-Undang', 'Bill', 
    'Perlembagaan', 'Constitution', 'Soalan', 'Question',
    'Parlimen', 'Parliament', 'Ekonomi', 'Economy',
    'Pendidikan', 'Education', 'Kesihatan', 'Health'
  ];
  
  for (const topic of commonTopics) {
    if (transcript.toLowerCase().includes(topic.toLowerCase())) {
      topics.add(topic);
    }
  }
  
  const titleMatch = transcript.match(/RANG UNDANG-UNDANG ([A-Z\s]+)/);
  if (titleMatch) {
    topics.add(titleMatch[1].trim());
  }
  
  return Array.from(topics).slice(0, 10);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Reference: blueprint:javascript_auth_all_persistance
  // Set up authentication routes (/api/login, /api/register, /api/logout, /api/user)
  setupAuth(app);

  // Get all MPs
  app.get("/api/mps", async (_req, res) => {
    try {
      const mps = await storage.getAllMps();
      const hansardRecords = await storage.getAllHansardRecords();
      
      // Calculate speaking participation and Hansard-based attendance for each MP
      const mpsWithAttendance = mps.map(mp => {
        // Normalize dates to YYYY-MM-DD for accurate comparison
        const mpSwornInDate = new Date(mp.swornInDate).toISOString().split('T')[0];
        
        // Get sessions after MP was sworn in
        const relevantSessions = hansardRecords.filter(record => {
          const sessionDate = new Date(record.sessionDate).toISOString().split('T')[0];
          return sessionDate >= mpSwornInDate;
        });
        
        const totalHansardSessions = relevantSessions.length;
        
        // Count sessions where MP was NOT absent
        const sessionsAttended = relevantSessions.filter(record => 
          !record.absentMpIds || !record.absentMpIds.includes(mp.id)
        ).length;
        
        // Count sessions where MP spoke (only from relevant sessions)
        const sessionsSpoke = relevantSessions.filter(record => 
          (record.speakerStats && record.speakerStats.some((stat: any) => stat.mpId === mp.id)) ||
          (record.speakers && record.speakers.some(speaker => speaker.mpId === mp.id))
        ).length;
        
        // Calculate total speeches from speakerStats
        const totalSpeeches = relevantSessions.reduce((total, record) => {
          if (record.speakerStats) {
            const mpStat = record.speakerStats.find((stat: any) => stat.mpId === mp.id);
            if (mpStat && (mpStat as any).totalSpeeches) {
              return total + (mpStat as any).totalSpeeches;
            }
          }
          return total;
        }, 0);
        
        return {
          ...mp,
          totalHansardSessions,
          hansardSessionsAttended: sessionsAttended,
          hansardSessionsSpoke: sessionsSpoke,
          totalSpeechInstances: totalSpeeches
        };
      });
      
      res.json(mpsWithAttendance);
    } catch (error) {
      console.error("Error fetching MPs:", error);
      res.status(500).json({ error: "Failed to fetch MPs" });
    }
  });

  // Get single MP by ID
  app.get("/api/mps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const mp = await storage.getMp(id);
      
      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }
      
      // Calculate real attendance from Hansard records
      const hansardRecords = await storage.getAllHansardRecords();
      
      // Normalize dates to YYYY-MM-DD for accurate comparison
      const mpSwornInDate = new Date(mp.swornInDate).toISOString().split('T')[0];
      
      // Get sessions after MP was sworn in
      const relevantSessions = hansardRecords.filter(record => {
        const sessionDate = new Date(record.sessionDate).toISOString().split('T')[0];
        return sessionDate >= mpSwornInDate;
      });
      
      const totalHansardSessions = relevantSessions.length;
      
      // Count sessions where MP was NOT absent
      const sessionsAttended = relevantSessions.filter(record => 
        !record.absentMpIds || !record.absentMpIds.includes(mp.id)
      ).length;
      
      // Count sessions where MP spoke (only from relevant sessions)
      const sessionsSpoke = relevantSessions.filter(record => 
        (record.speakerStats && record.speakerStats.some((stat: any) => stat.mpId === mp.id)) ||
        (record.speakers && record.speakers.some(speaker => speaker.mpId === mp.id))
      ).length;
      
      res.json({
        ...mp,
        totalHansardSessions,
        hansardSessionsAttended: sessionsAttended,
        hansardSessionsSpoke: sessionsSpoke
      });
    } catch (error) {
      console.error("Error fetching MP:", error);
      res.status(500).json({ error: "Failed to fetch MP" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (_req, res) => {
    try {
      const mps = await storage.getAllMps();
      
      // Calculate party breakdown
      const partyBreakdown = mps.reduce((acc, mp) => {
        const existing = acc.find((p) => p.party === mp.party);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ party: mp.party, count: 1 });
        }
        return acc;
      }, [] as { party: string; count: number }[]);

      // Calculate gender breakdown
      const genderBreakdown = mps.reduce((acc, mp) => {
        const existing = acc.find((g) => g.gender === mp.gender);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ gender: mp.gender, count: 1 });
        }
        return acc;
      }, [] as { gender: string; count: number }[]);

      // Calculate unique states
      const uniqueStates = new Set(mps.map((mp) => mp.state));

      // Calculate average attendance
      const totalDaysAttended = mps.reduce((sum, mp) => sum + mp.daysAttended, 0);
      const totalPossibleDays = mps.reduce((sum, mp) => sum + mp.totalParliamentDays, 0);
      const averageAttendanceRate = totalPossibleDays > 0 
        ? (totalDaysAttended / totalPossibleDays) * 100 
        : 0;

      res.json({
        totalMps: mps.length,
        partyBreakdown: partyBreakdown.sort((a, b) => b.count - a.count),
        genderBreakdown,
        stateCount: uniqueStates.size,
        averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
      res.status(500).json({ error: "Failed to calculate statistics" });
    }
  });

  // Get all court cases
  app.get("/api/court-cases", async (_req, res) => {
    try {
      const courtCases = await storage.getAllCourtCases();
      res.json(courtCases);
    } catch (error) {
      console.error("Error fetching court cases:", error);
      res.status(500).json({ error: "Failed to fetch court cases" });
    }
  });

  // Get court cases by MP ID
  app.get("/api/mps/:id/court-cases", async (req, res) => {
    try {
      const { id } = req.params;
      const courtCases = await storage.getCourtCasesByMpId(id);
      res.json(courtCases);
    } catch (error) {
      console.error("Error fetching court cases:", error);
      res.status(500).json({ error: "Failed to fetch court cases" });
    }
  });

  // Get single court case by ID
  app.get("/api/court-cases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const courtCase = await storage.getCourtCase(id);
      
      if (!courtCase) {
        return res.status(404).json({ error: "Court case not found" });
      }
      
      res.json(courtCase);
    } catch (error) {
      console.error("Error fetching court case:", error);
      res.status(500).json({ error: "Failed to fetch court case" });
    }
  });

  // Create a new court case
  app.post("/api/court-cases", async (req, res) => {
    try {
      const validatedData = insertCourtCaseSchema.parse(req.body);
      const courtCase = await storage.createCourtCase(validatedData);
      res.status(201).json(courtCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating court case:", error);
      res.status(500).json({ error: "Failed to create court case" });
    }
  });

  // Update a court case
  app.patch("/api/court-cases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCourtCaseSchema.partial().parse(req.body);
      const courtCase = await storage.updateCourtCase(id, validatedData);
      
      if (!courtCase) {
        return res.status(404).json({ error: "Court case not found" });
      }
      
      res.json(courtCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating court case:", error);
      res.status(500).json({ error: "Failed to update court case" });
    }
  });

  // Delete a court case
  app.delete("/api/court-cases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCourtCase(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Court case not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting court case:", error);
      res.status(500).json({ error: "Failed to delete court case" });
    }
  });

  // Get all SPRM investigations
  app.get("/api/sprm-investigations", async (_req, res) => {
    try {
      const investigations = await storage.getAllSprmInvestigations();
      res.json(investigations);
    } catch (error) {
      console.error("Error fetching SPRM investigations:", error);
      res.status(500).json({ error: "Failed to fetch SPRM investigations" });
    }
  });

  // Get SPRM investigations by MP ID
  app.get("/api/mps/:id/sprm-investigations", async (req, res) => {
    try {
      const { id } = req.params;
      const investigations = await storage.getSprmInvestigationsByMpId(id);
      res.json(investigations);
    } catch (error) {
      console.error("Error fetching SPRM investigations:", error);
      res.status(500).json({ error: "Failed to fetch SPRM investigations" });
    }
  });

  // Get single SPRM investigation by ID
  app.get("/api/sprm-investigations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const investigation = await storage.getSprmInvestigation(id);
      
      if (!investigation) {
        return res.status(404).json({ error: "SPRM investigation not found" });
      }
      
      res.json(investigation);
    } catch (error) {
      console.error("Error fetching SPRM investigation:", error);
      res.status(500).json({ error: "Failed to fetch SPRM investigation" });
    }
  });

  // Create a new SPRM investigation
  app.post("/api/sprm-investigations", async (req, res) => {
    try {
      const validatedData = insertSprmInvestigationSchema.parse(req.body);
      const investigation = await storage.createSprmInvestigation(validatedData);
      res.status(201).json(investigation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating SPRM investigation:", error);
      res.status(500).json({ error: "Failed to create SPRM investigation" });
    }
  });

  // Update an SPRM investigation
  app.patch("/api/sprm-investigations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateSprmInvestigationSchema.parse(req.body);
      const investigation = await storage.updateSprmInvestigation(id, validatedData);
      
      if (!investigation) {
        return res.status(404).json({ error: "SPRM investigation not found" });
      }
      
      res.json(investigation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating SPRM investigation:", error);
      res.status(500).json({ error: "Failed to update SPRM investigation" });
    }
  });

  // Delete an SPRM investigation
  app.delete("/api/sprm-investigations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSprmInvestigation(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "SPRM investigation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SPRM investigation:", error);
      res.status(500).json({ error: "Failed to delete SPRM investigation" });
    }
  });

  // ========== Legislative Proposals Routes ==========
  
  // Get all legislative proposals
  app.get("/api/legislative-proposals", async (_req, res) => {
    try {
      const proposals = await storage.getAllLegislativeProposals();
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching legislative proposals:", error);
      res.status(500).json({ error: "Failed to fetch legislative proposals" });
    }
  });

  // Get legislative proposals by MP ID
  app.get("/api/mps/:id/legislative-proposals", async (req, res) => {
    try {
      const { id } = req.params;
      const proposals = await storage.getLegislativeProposalsByMpId(id);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching legislative proposals:", error);
      res.status(500).json({ error: "Failed to fetch legislative proposals" });
    }
  });

  // Get single legislative proposal by ID
  app.get("/api/legislative-proposals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const proposal = await storage.getLegislativeProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ error: "Legislative proposal not found" });
      }
      
      res.json(proposal);
    } catch (error) {
      console.error("Error fetching legislative proposal:", error);
      res.status(500).json({ error: "Failed to fetch legislative proposal" });
    }
  });

  // Create a new legislative proposal
  app.post("/api/legislative-proposals", async (req, res) => {
    try {
      const validatedData = insertLegislativeProposalSchema.parse(req.body);
      const proposal = await storage.createLegislativeProposal(validatedData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating legislative proposal:", error);
      res.status(500).json({ error: "Failed to create legislative proposal" });
    }
  });

  // Update a legislative proposal
  app.patch("/api/legislative-proposals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertLegislativeProposalSchema.partial().parse(req.body);
      const proposal = await storage.updateLegislativeProposal(id, validatedData);
      
      if (!proposal) {
        return res.status(404).json({ error: "Legislative proposal not found" });
      }
      
      res.json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating legislative proposal:", error);
      res.status(500).json({ error: "Failed to update legislative proposal" });
    }
  });

  // Delete a legislative proposal
  app.delete("/api/legislative-proposals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLegislativeProposal(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Legislative proposal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting legislative proposal:", error);
      res.status(500).json({ error: "Failed to delete legislative proposal" });
    }
  });

  // ========== Debate Participation Routes ==========
  
  // Get all debate participations
  app.get("/api/debate-participations", async (_req, res) => {
    try {
      const participations = await storage.getAllDebateParticipations();
      res.json(participations);
    } catch (error) {
      console.error("Error fetching debate participations:", error);
      res.status(500).json({ error: "Failed to fetch debate participations" });
    }
  });

  // Get debate participations by MP ID
  app.get("/api/mps/:id/debate-participations", async (req, res) => {
    try {
      const { id } = req.params;
      const participations = await storage.getDebateParticipationsByMpId(id);
      res.json(participations);
    } catch (error) {
      console.error("Error fetching debate participations:", error);
      res.status(500).json({ error: "Failed to fetch debate participations" });
    }
  });

  // Get single debate participation by ID
  app.get("/api/debate-participations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const participation = await storage.getDebateParticipation(id);
      
      if (!participation) {
        return res.status(404).json({ error: "Debate participation not found" });
      }
      
      res.json(participation);
    } catch (error) {
      console.error("Error fetching debate participation:", error);
      res.status(500).json({ error: "Failed to fetch debate participation" });
    }
  });

  // Create a new debate participation
  app.post("/api/debate-participations", async (req, res) => {
    try {
      const validatedData = insertDebateParticipationSchema.parse(req.body);
      const participation = await storage.createDebateParticipation(validatedData);
      res.status(201).json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating debate participation:", error);
      res.status(500).json({ error: "Failed to create debate participation" });
    }
  });

  // Update a debate participation
  app.patch("/api/debate-participations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDebateParticipationSchema.partial().parse(req.body);
      const participation = await storage.updateDebateParticipation(id, validatedData);
      
      if (!participation) {
        return res.status(404).json({ error: "Debate participation not found" });
      }
      
      res.json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating debate participation:", error);
      res.status(500).json({ error: "Failed to update debate participation" });
    }
  });

  // Delete a debate participation
  app.delete("/api/debate-participations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDebateParticipation(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Debate participation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting debate participation:", error);
      res.status(500).json({ error: "Failed to delete debate participation" });
    }
  });

  // ========== Parliamentary Questions Routes ==========
  
  // Get all parliamentary questions
  app.get("/api/parliamentary-questions", async (_req, res) => {
    try {
      const questions = await storage.getAllParliamentaryQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching parliamentary questions:", error);
      res.status(500).json({ error: "Failed to fetch parliamentary questions" });
    }
  });

  // Get parliamentary questions by MP ID
  app.get("/api/mps/:id/parliamentary-questions", async (req, res) => {
    try {
      const { id } = req.params;
      const questions = await storage.getParliamentaryQuestionsByMpId(id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching parliamentary questions:", error);
      res.status(500).json({ error: "Failed to fetch parliamentary questions" });
    }
  });

  // Get Hansard speaking participation by MP ID
  app.get("/api/mps/:id/hansard-participation", async (req, res) => {
    try {
      const { id } = req.params;
      const participation = await storage.getHansardSpeakingParticipationByMpId(id);
      res.json(participation);
    } catch (error) {
      console.error("Error fetching Hansard participation:", error);
      res.status(500).json({ error: "Failed to fetch Hansard participation" });
    }
  });

  // Get 15th Parliament Hansard participation by MP ID
  app.get("/api/mps/:id/hansard-participation-15th", async (req, res) => {
    try {
      const { id } = req.params;
      
      const mp = await storage.getMp(id);
      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }
      
      const participation = await storage.get15thParliamentParticipationByMpId(id);
      res.json(participation);
    } catch (error) {
      console.error("Error fetching 15th Parliament Hansard participation:", error);
      res.status(500).json({ error: "Failed to fetch 15th Parliament Hansard participation" });
    }
  });

  // Get MP Hansard speaking record with recent sessions
  app.get("/api/mps/:id/hansard-speaking-record", async (req, res) => {
    try {
      const { id } = req.params;
      
      const mp = await storage.getMp(id);
      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }
      
      const record = await storage.getMpHansardSpeakingRecord(id);
      res.json(record);
    } catch (error) {
      console.error("Error fetching Hansard speaking record:", error);
      res.status(500).json({ error: "Failed to fetch Hansard speaking record" });
    }
  });

  // Get constituency-level Hansard participation for 15th Parliament
  app.get("/api/constituencies/hansard-participation-15th", async (req, res) => {
    try {
      const data = await storage.getConstituencyHansardParticipation15th();
      res.json(data);
    } catch (error) {
      console.error("Error fetching constituency Hansard participation:", error);
      res.status(500).json({ error: "Failed to fetch constituency Hansard participation" });
    }
  });

  // Get constituency speech statistics for 15th Parliament
  app.get("/api/constituency-speech-stats", async (req, res) => {
    try {
      // Fetch all 15th Parliament Hansard records
      const hansards = await storage.getHansardRecordsByParliament('15th Parliament');
      
      // Fetch all MPs for constituency mapping
      const allMps = await storage.getAllMps();
      const mpLookup = new Map(allMps.map(mp => [mp.id, mp]));
      
      // Track constituency speech counts
      const constituencySpeechData = new Map<string, {
        totalSpeeches: number;
        sessionsSpoke: number;
        mpNames: string[];
      }>();
      
      // Process each Hansard record
      for (const hansard of hansards) {
        const speakerStats = hansard.speakerStats as Array<{
          mpId: string;
          mpName: string;
          totalSpeeches: number;
          speakingOrder: number | null;
        }>;
        
        if (!speakerStats || speakerStats.length === 0) continue;
        
        const constituenciesInSession = new Set<string>();
        
        for (const stat of speakerStats) {
          const mp = mpLookup.get(stat.mpId);
          if (!mp) continue;
          
          const constituency = mp.constituency;
          
          if (!constituencySpeechData.has(constituency)) {
            constituencySpeechData.set(constituency, {
              totalSpeeches: 0,
              sessionsSpoke: 0,
              mpNames: [],
            });
          }
          
          const data = constituencySpeechData.get(constituency)!;
          data.totalSpeeches += stat.totalSpeeches || 0;
          
          if (!data.mpNames.includes(mp.name)) {
            data.mpNames.push(mp.name);
          }
          
          constituenciesInSession.add(constituency);
        }
        
        // Increment session count for constituencies that spoke in this session
        for (const constituency of Array.from(constituenciesInSession)) {
          const data = constituencySpeechData.get(constituency);
          if (data) {
            data.sessionsSpoke++;
          }
        }
      }
      
      // Convert to array and sort by total speeches
      const sortedConstituencies = Array.from(constituencySpeechData.entries())
        .map(([constituency, data]) => ({
          constituency,
          totalSpeeches: data.totalSpeeches,
          sessionsSpoke: data.sessionsSpoke,
          mps: data.mpNames,
        }))
        .sort((a, b) => b.totalSpeeches - a.totalSpeeches);
      
      res.json({
        metadata: {
          parliamentTerm: '15th Parliament',
          totalSessions: hansards.length,
          totalConstituencies: constituencySpeechData.size,
          generatedAt: new Date().toISOString(),
        },
        constituencies: sortedConstituencies,
      });
    } catch (error) {
      console.error("Error fetching constituency speech stats:", error);
      res.status(500).json({ error: "Failed to fetch constituency speech stats" });
    }
  });

  // Get single parliamentary question by ID
  app.get("/api/parliamentary-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const question = await storage.getParliamentaryQuestion(id);
      
      if (!question) {
        return res.status(404).json({ error: "Parliamentary question not found" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error fetching parliamentary question:", error);
      res.status(500).json({ error: "Failed to fetch parliamentary question" });
    }
  });

  // Create a new parliamentary question
  app.post("/api/parliamentary-questions", async (req, res) => {
    try {
      const validatedData = insertParliamentaryQuestionSchema.parse(req.body);
      const question = await storage.createParliamentaryQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating parliamentary question:", error);
      res.status(500).json({ error: "Failed to create parliamentary question" });
    }
  });

  // Update a parliamentary question
  app.patch("/api/parliamentary-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertParliamentaryQuestionSchema.partial().parse(req.body);
      const question = await storage.updateParliamentaryQuestion(id, validatedData);
      
      if (!question) {
        return res.status(404).json({ error: "Parliamentary question not found" });
      }
      
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating parliamentary question:", error);
      res.status(500).json({ error: "Failed to update parliamentary question" });
    }
  });

  // Delete a parliamentary question
  app.delete("/api/parliamentary-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteParliamentaryQuestion(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Parliamentary question not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting parliamentary question:", error);
      res.status(500).json({ error: "Failed to delete parliamentary question" });
    }
  });

  // Search Hansard records
  app.get("/api/hansard-records/search", async (req, res) => {
    try {
      const { query, startDate, endDate, sessionNumber } = req.query;
      let records = await storage.getAllHansardRecords();
      
      if (query && typeof query === 'string') {
        const searchTerm = query.toLowerCase();
        records = records.filter(record => 
          record.transcript.toLowerCase().includes(searchTerm) ||
          record.topics.some((topic: string) => topic.toLowerCase().includes(searchTerm)) ||
          record.sessionNumber.toLowerCase().includes(searchTerm)
        );
      }
      
      if (startDate && typeof startDate === 'string') {
        records = records.filter(record => 
          new Date(record.sessionDate) >= new Date(startDate)
        );
      }
      
      if (endDate && typeof endDate === 'string') {
        records = records.filter(record => 
          new Date(record.sessionDate) <= new Date(endDate)
        );
      }
      
      if (sessionNumber && typeof sessionNumber === 'string') {
        records = records.filter(record => 
          record.sessionNumber.toLowerCase().includes(sessionNumber.toLowerCase())
        );
      }
      
      // Fix localhost URLs in PDF links
      const fixedRecords = records.map(record => fixHansardPdfUrls(record, req));
      res.json(fixedRecords);
    } catch (error) {
      console.error("Error searching Hansard records:", error);
      res.status(500).json({ error: "Failed to search Hansard records" });
    }
  });

  // Get all Hansard records
  app.get("/api/hansard-records", async (req, res) => {
    try {
      const records = await storage.getAllHansardRecords();
      // Fix localhost URLs in PDF links
      const fixedRecords = records.map(record => fixHansardPdfUrls(record, req));
      res.json(fixedRecords);
    } catch (error) {
      console.error("Error fetching Hansard records:", error);
      res.status(500).json({ error: "Failed to fetch Hansard records" });
    }
  });

  // Get single Hansard record by ID
  app.get("/api/hansard-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getHansardRecord(id);
      
      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      // Fix localhost URLs in PDF links
      const fixedRecord = fixHansardPdfUrls(record, req);
      res.json(fixedRecord);
    } catch (error) {
      console.error("Error fetching Hansard record:", error);
      res.status(500).json({ error: "Failed to fetch Hansard record" });
    }
  });

  // Delete a Hansard record
  app.delete("/api/hansard-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteHansardRecord(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Hansard record:", error);
      res.status(500).json({ error: "Failed to delete Hansard record" });
    }
  });

  // Get Hansard records by session number
  app.get("/api/hansard-records/session/:sessionNumber", async (req, res) => {
    try {
      const { sessionNumber } = req.params;
      const records = await storage.getHansardRecordsBySessionNumber(sessionNumber);
      // Fix localhost URLs in PDF links
      const fixedRecords = records.map(record => fixHansardPdfUrls(record, req));
      res.json(fixedRecords);
    } catch (error) {
      console.error("Error fetching Hansard records by session:", error);
      res.status(500).json({ error: "Failed to fetch Hansard records by session" });
    }
  });

  // Download primary PDF file for a Hansard record
  app.get("/api/hansard-records/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const { eq, and } = await import("drizzle-orm");
      
      // Find the primary PDF for this Hansard record
      const [pdfFile] = await db.select().from(hansardPdfFiles)
        .where(and(
          eq(hansardPdfFiles.hansardRecordId, id),
          eq(hansardPdfFiles.isPrimary, true)
        ))
        .limit(1);
      
      if (!pdfFile) {
        return res.status(404).json({ error: "PDF file not found for this Hansard record" });
      }
      
      // Set proper headers for PDF download
      res.setHeader('Content-Type', pdfFile.contentType);
      res.setHeader('Content-Length', pdfFile.fileSizeBytes.toString());
      res.setHeader('Content-Disposition', `inline; filename="${pdfFile.originalFilename}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Send the binary PDF data
      res.send(pdfFile.pdfData);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to download PDF" });
    }
  });

  // Download PDF file by file ID (direct access)
  app.get("/api/hansard-pdf/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { eq } = await import("drizzle-orm");
      
      const [pdfFile] = await db.select().from(hansardPdfFiles).where(eq(hansardPdfFiles.id, fileId));
      
      if (!pdfFile) {
        return res.status(404).json({ error: "PDF file not found" });
      }
      
      // Set proper headers for PDF download
      res.setHeader('Content-Type', pdfFile.contentType);
      res.setHeader('Content-Length', pdfFile.fileSizeBytes.toString());
      res.setHeader('Content-Disposition', `inline; filename="${pdfFile.originalFilename}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Send the binary PDF data
      res.send(pdfFile.pdfData);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to download PDF" });
    }
  });

  // Upload and parse Hansard PDF(s)
  app.post("/api/hansard-records/upload", upload.array('pdfs', 25), handleMulterError, async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No PDF files uploaded. Only PDF files are accepted." });
      }

      console.log(`📤 Received ${files.length} PDF upload(s)`);

      // Get all MPs from database once
      const allMps = await db.select().from(mps);
      const parser = new HansardPdfParser(allMps);
      
      const results = [];
      
      // Process each file
      for (const file of files) {
        try {
          console.log(`📄 Processing: ${file.originalname} (${file.size} bytes)`);
          
          // Calculate MD5 hash first to check for duplicates
          const md5Hash = crypto.createHash('md5').update(file.buffer).digest('hex');
          
          // Check if this exact PDF already exists
          const pdfCheck = await storage.checkPdfExistsByMd5(md5Hash);
          if (pdfCheck.exists) {
            console.log(`⏭️  Skipping: ${file.originalname} - Duplicate PDF already exists (Session: ${pdfCheck.sessionNumber})`);
            results.push({
              success: true,
              fileName: file.originalname,
              skipped: true,
              reason: `Duplicate file already exists for session ${pdfCheck.sessionNumber}`,
              sessionNumber: pdfCheck.sessionNumber,
            });
            continue;
          }
          
          // Parse the PDF with filename for better date extraction
          const parsed = await parser.parseHansardPdf(file.buffer, file.originalname);

          // Check if this session already exists
          const existingSession = await storage.getHansardRecordsBySessionNumber(parsed.metadata.sessionNumber);
          if (existingSession.length > 0) {
            console.log(`⏭️  Skipping: ${file.originalname} - Session ${parsed.metadata.sessionNumber} already exists`);
            results.push({
              success: true,
              fileName: file.originalname,
              skipped: true,
              reason: `Session ${parsed.metadata.sessionNumber} already exists in database`,
              sessionNumber: parsed.metadata.sessionNumber,
            });
            continue;
          }

          // Count speeches per MP from allSpeakingInstances
          const speechesPerMp = new Map<string, number>();
          for (const instance of parsed.allSpeakingInstances) {
            speechesPerMp.set(instance.mpId, (speechesPerMp.get(instance.mpId) || 0) + 1);
          }

          // Create Hansard record first (truncate transcript to match background job behavior)
          const hansardData = {
            sessionNumber: parsed.metadata.sessionNumber,
            sessionDate: parsed.metadata.sessionDate,
            parliamentTerm: parsed.metadata.parliamentTerm,
            sitting: parsed.metadata.sitting,
            transcript: parsed.transcript.substring(0, 100000), // Truncate to 100k chars
            summary: `Parliamentary session ${parsed.metadata.sessionNumber} with ${parsed.speakerStats.constituenciesSpoke} constituencies speaking out of ${parsed.speakerStats.constituenciesAttended} attended (${parsed.speakerStats.attendanceRate.toFixed(1)}% participation rate).`,
            summaryLanguage: 'en' as const,
            pdfLinks: [], // No longer using pdfLinks
            topics: parsed.topics,
            speakers: parsed.speakers,
            speakerStats: parsed.speakers.map((s, idx) => ({
              mpId: s.mpId,
              mpName: s.mpName,
              totalSpeeches: speechesPerMp.get(s.mpId) || 1,
              speakingOrder: idx + 1,
            })),
            sessionSpeakerStats: parsed.speakerStats, // Session-level speaker statistics
            voteRecords: [],
            attendedMpIds: parsed.attendance.attendedMpIds,
            absentMpIds: parsed.attendance.absentMpIds,
            constituenciesPresent: parsed.speakerStats.constituenciesAttended, // Matches sessionSpeakerStats for consistency
            constituenciesAbsent: parsed.attendance.absentConstituencies.length,
          };

          const record = await storage.createHansardRecord(hansardData);
          
          // Save unmatched speakers for diagnostics and manual mapping
          if (parsed.unmatchedSpeakersDetailed && parsed.unmatchedSpeakersDetailed.length > 0) {
            console.log(`💾 Saving ${parsed.unmatchedSpeakersDetailed.length} unmatched speakers for diagnostic purposes`);
            
            for (const unmatched of parsed.unmatchedSpeakersDetailed) {
              await db.insert(unmatchedSpeakers).values({
                hansardRecordId: record.id,
                extractedName: unmatched.extractedName,
                extractedConstituency: unmatched.extractedConstituency || null,
                matchFailureReason: unmatched.failureReason,
                speakingOrder: unmatched.speakingOrder,
                rawHeaderText: unmatched.rawHeaderText,
                suggestedMpIds: unmatched.suggestedMpIds,
                isMapped: false,
              });
            }
          }

          // Save parliamentary questions
          if (parsed.questions && parsed.questions.length > 0) {
            console.log(`💾 Saving ${parsed.questions.length} parliamentary questions`);
            for (const question of parsed.questions) {
              if (question.mpId) {
                await storage.createParliamentaryQuestion({
                  mpId: question.mpId,
                  questionText: question.questionText,
                  dateAsked: parsed.metadata.sessionDate,
                  ministry: question.ministry,
                  topic: question.topic,
                  answerStatus: question.answerStatus,
                  hansardReference: parsed.metadata.sessionNumber,
                  answerText: question.answerText || null,
                  questionType: question.questionType,
                  questionNumber: question.questionNumber || null,
                  hansardRecordId: record.id,
                });
              }
            }
          }

          // Save bills and motions
          if (parsed.bills && parsed.bills.length > 0) {
            console.log(`💾 Saving ${parsed.bills.length} bills`);
            for (const bill of parsed.bills) {
              if (bill.mpId) {
                await storage.createLegislativeProposal({
                  mpId: bill.mpId,
                  title: bill.title,
                  type: 'Bill',
                  dateProposed: parsed.metadata.sessionDate,
                  status: bill.status,
                  description: bill.description,
                  hansardReference: parsed.metadata.sessionNumber,
                  outcome: null,
                  billNumber: bill.billNumber || null,
                  coSponsors: bill.coSponsors || [],
                  hansardRecordId: record.id,
                });
              }
            }
          }

          if (parsed.motions && parsed.motions.length > 0) {
            console.log(`💾 Saving ${parsed.motions.length} motions`);
            for (const motion of parsed.motions) {
              if (motion.mpId) {
                await storage.createLegislativeProposal({
                  mpId: motion.mpId,
                  title: motion.title,
                  type: 'Motion',
                  dateProposed: parsed.metadata.sessionDate,
                  status: motion.status,
                  description: motion.description,
                  hansardReference: parsed.metadata.sessionNumber,
                  outcome: null,
                  billNumber: null,
                  coSponsors: motion.coSponsors || [],
                  hansardRecordId: record.id,
                });
              }
            }
          }
          
          // Store PDF in database (md5Hash already calculated earlier)
          // Check if a PDF with this hash already exists for this record
          const { eq, and } = await import("drizzle-orm");
          const [existingPdf] = await db.select().from(hansardPdfFiles)
            .where(and(
              eq(hansardPdfFiles.hansardRecordId, record.id),
              eq(hansardPdfFiles.md5Hash, md5Hash)
            ));
          
          if (existingPdf) {
            // Duplicate found - ensure it's marked as primary if not already
            if (!existingPdf.isPrimary) {
              await db.update(hansardPdfFiles)
                .set({ isPrimary: false })
                .where(eq(hansardPdfFiles.hansardRecordId, record.id));
              
              await db.update(hansardPdfFiles)
                .set({ isPrimary: true })
                .where(eq(hansardPdfFiles.id, existingPdf.id));
            }
            console.log(`✓ PDF already exists (same MD5 hash), using existing file as primary`);
          } else {
            // New PDF - clear previous primary flags and insert
            await db.update(hansardPdfFiles)
              .set({ isPrimary: false })
              .where(eq(hansardPdfFiles.hansardRecordId, record.id));
            
            const [pdfFile] = await db.insert(hansardPdfFiles).values({
              hansardRecordId: record.id,
              originalFilename: file.originalname,
              fileSizeBytes: file.size,
              contentType: 'application/pdf',
              pdfData: file.buffer,
              md5Hash,
              uploadedBy: null,
              isPrimary: true,
            }).returning();
            
            console.log(`💾 Saved new PDF to database: ${pdfFile.id}`);
          }

          // Update MP speaking statistics
          const speakerIds = parsed.speakers.map(s => s.mpId);
          for (const mpId of speakerIds) {
            const mp = allMps.find(m => m.id === mpId);
            if (mp) {
              const { eq } = await import("drizzle-orm");
              const speechCount = speechesPerMp.get(mpId) || 0;
              
              // Only increment if MP actually spoke (has speech instances)
              if (speechCount > 0) {
                await db.update(mps)
                  .set({ 
                    hansardSessionsSpoke: mp.hansardSessionsSpoke + 1,
                    totalSpeechInstances: mp.totalSpeechInstances + speechCount
                  })
                  .where(eq(mps.id, mpId));
              }
            }
          }

          console.log(`✅ Successfully created Hansard record ${parsed.metadata.sessionNumber}`);

          results.push({
            success: true,
            fileName: file.originalname,
            sessionNumber: parsed.metadata.sessionNumber,
            speakersFound: parsed.speakers.length,
            unmatchedSpeakers: parsed.unmatchedSpeakers,
            attendedCount: parsed.attendance.attendedMpIds.length,
            absentCount: parsed.attendance.absentMpIds.length,
          });
        } catch (error) {
          console.error(`❌ Error processing ${file.originalname}:`, error);
          results.push({
            success: false,
            fileName: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Upload complete: ${successCount}/${files.length} successful`);

      // Return appropriate status code based on results
      const statusCode = successCount === 0 ? 400 : successCount === files.length ? 201 : 207;
      res.status(statusCode).json({ results });
    } catch (error) {
      console.error("Error processing Hansard PDFs:", error);
      res.status(500).json({ 
        error: "Failed to process Hansard PDFs", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Analyze Hansard PDF for specific MP speeches (transient analysis, no persistence)
  app.post("/api/hansard-analysis", async (req, res) => {
    try {
      const requestSchema = z.object({
        hansardRecordId: z.string(),
        mpId: z.string(),
      });

      const validation = requestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors.map(e => e.message).join(", ")
        });
      }

      const { hansardRecordId, mpId } = validation.data;

      // Fetch the Hansard record from database
      const hansardRecord = await storage.getHansardRecord(hansardRecordId);
      if (!hansardRecord) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      console.log(`📊 Analyzing Hansard session ${hansardRecord.sessionNumber} for MP: ${mpId}`);

      // Get all MPs from database
      const allMps = await db.select().from(mps);
      
      // Find target MP
      const targetMp = allMps.find(mp => mp.id === mpId);
      if (!targetMp) {
        return res.status(404).json({ error: "MP not found" });
      }

      // Get PDF data - first try from database, then fall back to downloading from URL
      let pdfBuffer: Buffer;

      try {
        // Try to get PDF from database first (new approach)
        const { eq, desc } = await import("drizzle-orm");
        const [pdfFile] = await db.select().from(hansardPdfFiles)
          .where(eq(hansardPdfFiles.hansardRecordId, hansardRecordId))
          .orderBy(desc(hansardPdfFiles.isPrimary))
          .limit(1);

        if (pdfFile && pdfFile.pdfData) {
          pdfBuffer = pdfFile.pdfData;
          console.log(`✅ Using stored PDF from database: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        } else if (hansardRecord.pdfLinks && hansardRecord.pdfLinks.length > 0) {
          // Fall back to downloading from URL (old approach for backwards compatibility)
          const pdfUrl = hansardRecord.pdfLinks[0];
          const axios = await import('axios');
          console.log(`📥 Downloading PDF from: ${pdfUrl}`);
          const response = await axios.default.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
          });
          pdfBuffer = Buffer.from(response.data);
          console.log(`✅ Downloaded PDF: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        } else {
          return res.status(400).json({ 
            error: "No PDF available for this Hansard record",
            details: "This session does not have any PDF files stored in the database or linked URLs"
          });
        }
      } catch (pdfError) {
        console.error("Error getting PDF:", pdfError);
        return res.status(500).json({ 
          error: "Failed to retrieve PDF data", 
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
        });
      }

      // Parse using HansardPdfParser - uses canonical speaker identification
      const parser = new HansardPdfParser(allMps);
      const parsed = await parser.parseHansardPdf(pdfBuffer, hansardRecord.sessionNumber);

      // Filter unique speakers for target MP (deduplicated)
      const targetSpeakers = parsed.speakers.filter(s => s.mpId === mpId);

      // Use parser's canonical speaking instance data
      // Filter all instances for the target MP
      const allSpeechInstances = parsed.allSpeakingInstances
        .filter(inst => inst.mpId === mpId)
        .map(inst => ({
          position: inst.lineNumber * 100, // Approximate position based on line number
          capturedName: inst.capturedHeader,
          context: `Speaking instance ${inst.instanceNumber} at line ${inst.lineNumber}`,
          speakingOrder: inst.instanceNumber,
          constituency: inst.constituency,
          speechText: inst.speechText || '(No speech content captured)'
        }));

      console.log(`📊 Found ${targetSpeakers.length} unique speaking slots and ${allSpeechInstances.length} total speech instances for ${targetMp.name} (via parser canonical data)`);

      // Check attendance status
      const wasPresent = parsed.attendance.attendedMpIds.includes(mpId);
      const wasAbsent = parsed.attendance.absentMpIds.includes(mpId);
      
      const attendanceStatus = wasPresent ? 'present' : wasAbsent ? 'absent' : 'unknown';

      // Return combined analysis
      res.json({
        success: true,
        mp: {
          id: targetMp.id,
          name: targetMp.name,
          constituency: targetMp.constituency,
          party: targetMp.party,
        },
        metadata: {
          sessionNumber: parsed.metadata.sessionNumber,
          sessionDate: parsed.metadata.sessionDate,
          parliamentTerm: parsed.metadata.parliamentTerm,
          sitting: parsed.metadata.sitting,
        },
        attendanceStatus,
        uniqueSpeakers: {
          count: targetSpeakers.length,
          speakers: targetSpeakers,
        },
        allSpeechInstances: {
          count: allSpeechInstances.length,
          instances: allSpeechInstances,
        },
        sessionStats: {
          totalUniqueSpeakers: parsed.speakers.length,
          attendedMps: parsed.attendance.attendedMpIds.length,
          absentMps: parsed.attendance.absentMpIds.length,
          unmatchedSpeakers: parsed.unmatchedSpeakers.length,
          unmatchedSpeakerNames: parsed.unmatchedSpeakers,
        }
      });

      console.log(`✅ Analysis complete: ${targetSpeakers.length} unique speaking instances, ${allSpeechInstances.length} total speeches`);
    } catch (error) {
      console.error("Error analyzing Hansard PDF:", error);
      res.status(500).json({ 
        error: "Failed to analyze Hansard PDF", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Analyze Hansard PDF for speaker statistics (attendance vs participation)
  app.post("/api/hansard-speaker-stats", upload.single('pdf'), handleMulterError, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded. Only PDF files are accepted." });
      }

      console.log(`📊 Analyzing speaker statistics for: ${req.file.originalname}`);

      // Get all MPs from database
      const allMps = await db.select().from(mps);
      
      // Parse using HansardPdfParser
      const parser = new HansardPdfParser(allMps);
      const parsed = await parser.parseHansardPdf(req.file.buffer, req.file.originalname);

      console.log(`✅ Analysis complete: ${parsed.speakerStats.constituenciesSpoke} constituencies spoke out of ${parsed.speakerStats.constituenciesAttended} attended`);

      // Return detailed speaker statistics
      res.json({
        success: true,
        filename: req.file.originalname,
        metadata: {
          sessionNumber: parsed.metadata.sessionNumber,
          sessionDate: parsed.metadata.sessionDate,
          parliamentTerm: parsed.metadata.parliamentTerm,
          sitting: parsed.metadata.sitting,
        },
        speakerStatistics: {
          totalUniqueSpeakers: parsed.speakerStats.totalUniqueSpeakers,
          constituenciesAttended: parsed.speakerStats.constituenciesAttended,
          constituenciesSpoke: parsed.speakerStats.constituenciesSpoke,
          attendanceRate: parseFloat(parsed.speakerStats.attendanceRate.toFixed(1)),
          speakingConstituencies: parsed.speakerStats.speakingConstituencies,
          constituenciesAttendedButSilent: parsed.speakerStats.constituenciesAttendedButSilent,
        },
        attendance: {
          attendedMpIds: parsed.attendance.attendedMpIds,
          absentMpIds: parsed.attendance.absentMpIds,
          attendedConstituencies: parsed.attendance.attendedConstituencies,
          absentConstituencies: parsed.attendance.absentConstituencies,
        },
        speakers: parsed.speakers.map(s => ({
          mpId: s.mpId,
          mpName: s.mpName,
          constituency: s.constituency,
          speakingOrder: s.speakingOrder,
        })),
        topics: parsed.topics,
        unmatchedSpeakers: parsed.unmatchedSpeakers,
      });
    } catch (error) {
      console.error("Error analyzing Hansard speaker statistics:", error);
      res.status(500).json({ 
        error: "Failed to analyze Hansard PDF", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Create a new Hansard record
  app.post("/api/hansard-records", async (req, res) => {
    try {
      const validatedData = insertHansardRecordSchema.parse(req.body);
      const record = await storage.createHansardRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating Hansard record:", error);
      res.status(500).json({ error: "Failed to create Hansard record" });
    }
  });

  // Update a Hansard record
  app.patch("/api/hansard-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateHansardRecordSchema.parse(req.body);
      const record = await storage.updateHansardRecord(id, validatedData);
      
      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating Hansard record:", error);
      res.status(500).json({ error: "Failed to update Hansard record" });
    }
  });

  // Delete multiple Hansard records
  app.post("/api/hansard-records/bulk-delete", async (req, res) => {
    try {
      const schema = z.object({
        ids: z.array(z.string()).min(1, "At least one ID is required")
      });
      
      const { ids } = schema.parse(req.body);
      const deletedCount = await storage.deleteBulkHansardRecords(ids);
      
      res.status(200).json({ 
        message: `${deletedCount} Hansard record${deletedCount !== 1 ? 's' : ''} deleted successfully`,
        deletedCount 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error bulk deleting Hansard records:", error);
      res.status(500).json({ error: "Failed to delete Hansard records" });
    }
  });

  // Get unmatched speakers for a specific Hansard record
  app.get("/api/hansard-records/:id/unmatched-speakers", async (req, res) => {
    try {
      const { id } = req.params;
      const { desc } = await import("drizzle-orm");
      
      const speakers = await db.select()
        .from(unmatchedSpeakers)
        .where(eq(unmatchedSpeakers.hansardRecordId, id))
        .orderBy(unmatchedSpeakers.speakingOrder);
      
      res.json(speakers);
    } catch (error) {
      console.error("Error fetching unmatched speakers:", error);
      res.status(500).json({ error: "Failed to fetch unmatched speakers" });
    }
  });

  // Get all unmatched speakers across all Hansard records
  app.get("/api/unmatched-speakers", async (req, res) => {
    try {
      const { unmappedOnly } = req.query;
      const { desc } = await import("drizzle-orm");
      
      let query = db.select()
        .from(unmatchedSpeakers)
        .orderBy(desc(unmatchedSpeakers.createdAt));
      
      if (unmappedOnly === 'true') {
        query = query.where(eq(unmatchedSpeakers.isMapped, false));
      }
      
      const speakers = await query;
      
      res.json(speakers);
    } catch (error) {
      console.error("Error fetching unmatched speakers:", error);
      res.status(500).json({ error: "Failed to fetch unmatched speakers" });
    }
  });

  // Create a manual speaker mapping
  app.post("/api/speaker-mappings", async (req, res) => {
    try {
      const validatedData = insertSpeakerMappingSchema.parse(req.body);
      
      // Create the mapping
      const [mapping] = await db.insert(speakerMappings)
        .values({
          ...validatedData,
          mappedBy: validatedData.mappedBy || null,
          confidence: validatedData.confidence || 1.0,
          notes: validatedData.notes || null,
        })
        .returning();
      
      // Mark the unmatched speaker as mapped
      await db.update(unmatchedSpeakers)
        .set({ 
          isMapped: true,
          mappedMpId: validatedData.mpId,
        })
        .where(eq(unmatchedSpeakers.id, validatedData.unmatchedSpeakerId));
      
      res.status(201).json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating speaker mapping:", error);
      res.status(500).json({ error: "Failed to create speaker mapping" });
    }
  });

  // Get suggested MP matches for an unmatched speaker
  app.get("/api/unmatched-speakers/:id/suggestions", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch the unmatched speaker
      const [unmatchedSpeaker] = await db.select()
        .from(unmatchedSpeakers)
        .where(eq(unmatchedSpeakers.id, id))
        .limit(1);
      
      if (!unmatchedSpeaker) {
        return res.status(404).json({ error: "Unmatched speaker not found" });
      }
      
      // Get all MPs
      const allMps = await db.select().from(mps);
      
      // Use the MP name matcher to find suggestions
      const matcher = new MPNameMatcher(allMps);
      const suggestions = matcher.findSuggestedMatches(
        unmatchedSpeaker.extractedName,
        unmatchedSpeaker.extractedConstituency || undefined,
        5 // Return top 5 suggestions
      );
      
      res.json({
        unmatchedSpeaker,
        suggestions: suggestions.map(s => ({
          mpId: s.mpId,
          mpName: s.mpName,
          constituency: s.constituency,
          party: s.party,
          score: s.score,
          reason: s.reason,
        }))
      });
    } catch (error) {
      console.error("Error fetching speaker suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // Summarize a Hansard record using AI
  app.post("/api/hansard-records/:id/summarize", async (req, res) => {
    try {
      const { id } = req.params;
      
      const schema = z.object({
        maxLength: z.number().min(100).max(1000).default(500),
        language: z.enum(["en", "ms", "zh"]).default("en")
      });
      
      const validatedData = schema.parse(req.body);
      
      const record = await storage.getHansardRecord(id);
      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      if (record.summary) {
        return res.status(200).json({ 
          message: "Summary already exists", 
          record 
        });
      }
      
      const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
      
      if (!HUGGINGFACE_API_KEY) {
        return res.status(500).json({ error: "Hugging Face API key not configured" });
      }

      const languageInstructionMap: Record<string, string> = {
        en: "Summarize in English: ",
        ms: "Ringkaskan dalam Bahasa Malaysia: ",
        zh: "用中文总结: "
      };
      
      const languageInstruction = languageInstructionMap[validatedData.language];
      const inputText = languageInstruction + record.transcript;

      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/csebuetnlp/mT5_multilingual_XLSum",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: inputText,
            parameters: {
              max_length: validatedData.maxLength,
              min_length: 30,
              do_sample: false,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error:", errorText);
        
        if (response.status === 503) {
          return res.status(503).json({ 
            error: "Model is loading. Please try again in a moment.",
            retry: true 
          });
        }
        
        return res.status(response.status).json({ 
          error: "Failed to generate summary",
          details: errorText 
        });
      }

      const result = await response.json();
      const summary = Array.isArray(result) && result[0]?.summary_text 
        ? result[0].summary_text 
        : result.summary_text || "Summary not available";
      
      const updatedRecord = await storage.updateHansardRecord(id, {
        summary,
        summaryLanguage: validatedData.language
      });
      
      res.json(updatedRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error summarizing Hansard record:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to summarize Hansard record" 
      });
    }
  });

  // Get absent MPs for a specific Hansard record
  app.get("/api/hansard-records/:id/absent-mps", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getHansardRecord(id);
      
      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      const allMps = await storage.getAllMps();
      const speakerIds = new Set(record.speakers.map(s => s.mpId));
      
      const absentMps = allMps.filter(mp => !speakerIds.has(mp.id));
      
      const partyBreakdown = absentMps.reduce((acc, mp) => {
        const existing = acc.find(p => p.party === mp.party);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ party: mp.party, count: 1 });
        }
        return acc;
      }, [] as { party: string; count: number }[]);
      
      res.json({
        sessionNumber: record.sessionNumber,
        sessionDate: record.sessionDate,
        totalAbsent: absentMps.length,
        totalMps: allMps.length,
        attendanceRate: ((allMps.length - absentMps.length) / allMps.length) * 100,
        partyBreakdown: partyBreakdown.sort((a, b) => b.count - a.count),
        absentMps: absentMps.map(mp => ({
          id: mp.id,
          name: mp.name,
          party: mp.party,
          state: mp.state,
          constituency: mp.constituency,
          photoUrl: mp.photoUrl
        }))
      });
    } catch (error) {
      console.error("Error fetching absent MPs:", error);
      res.status(500).json({ error: "Failed to fetch absent MPs" });
    }
  });

  // Get constituency attendance for a specific Hansard record
  app.get("/api/hansard-records/:id/constituency-attendance", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getHansardRecord(id);
      
      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }
      
      const allMps = await storage.getAllMps();
      const absentMpIds = new Set(record.absentMpIds || []);
      
      const attendedMps = allMps.filter(mp => !absentMpIds.has(mp.id));
      const absentMps = allMps.filter(mp => absentMpIds.has(mp.id));
      
      const attendedConstituencies = attendedMps.map(mp => ({
        constituency: mp.constituency,
        state: mp.state,
        party: mp.party,
        mpName: mp.name,
        mpId: mp.id
      })).sort((a, b) => a.constituency.localeCompare(b.constituency));
      
      const absentConstituencies = absentMps.map(mp => ({
        constituency: mp.constituency,
        state: mp.state,
        party: mp.party,
        mpName: mp.name,
        mpId: mp.id
      })).sort((a, b) => a.constituency.localeCompare(b.constituency));
      
      const stateBreakdown = allMps.reduce((acc, mp) => {
        if (!acc[mp.state]) {
          acc[mp.state] = { total: 0, attended: 0, absent: 0 };
        }
        acc[mp.state].total++;
        if (absentMpIds.has(mp.id)) {
          acc[mp.state].absent++;
        } else {
          acc[mp.state].attended++;
        }
        return acc;
      }, {} as Record<string, { total: number; attended: number; absent: number }>);
      
      const stateStats = Object.entries(stateBreakdown).map(([state, stats]) => ({
        state,
        ...stats,
        attendanceRate: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0
      })).sort((a, b) => b.attendanceRate - a.attendanceRate);
      
      res.json({
        sessionNumber: record.sessionNumber,
        sessionDate: record.sessionDate,
        totalConstituencies: allMps.length,
        attendedConstituencies: attendedConstituencies.length,
        absentConstituencies: absentConstituencies.length,
        attendanceRate: allMps.length > 0 ? (attendedConstituencies.length / allMps.length) * 100 : 0,
        attended: attendedConstituencies,
        absent: absentConstituencies,
        stateStats
      });
    } catch (error) {
      console.error("Error fetching constituency attendance:", error);
      res.status(500).json({ error: "Failed to fetch constituency attendance" });
    }
  });

  // Get historical constituency attendance across all Hansard sessions
  app.get("/api/constituencies/attendance-history", async (req, res) => {
    try {
      const { startDate, endDate, party, state } = req.query;
      
      const allMps = await storage.getAllMps();
      let records = await storage.getAllHansardRecords();
      
      // Apply date filters
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        records = records.filter(r => new Date(r.sessionDate) >= start);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        records = records.filter(r => new Date(r.sessionDate) <= end);
      }
      
      // Group MPs by constituency
      const constituencyMap = new Map<string, {
        constituency: string;
        state: string;
        mps: Array<{
          id: string;
          name: string;
          party: string;
          swornInDate: Date;
          termEndDate: Date | null;
        }>;
      }>();
      
      for (const mp of allMps) {
        if (!constituencyMap.has(mp.constituency)) {
          constituencyMap.set(mp.constituency, {
            constituency: mp.constituency,
            state: mp.state,
            mps: []
          });
        }
        constituencyMap.get(mp.constituency)!.mps.push({
          id: mp.id,
          name: mp.name,
          party: mp.party,
          swornInDate: mp.swornInDate,
          termEndDate: mp.termEndDate
        });
      }
      
      // Calculate attendance for each constituency
      const constituencyData = Array.from(constituencyMap.values()).map(data => {
        // Sort MPs by swornInDate descending (most recent first)
        const sortedMps = data.mps.sort((a, b) => b.swornInDate.getTime() - a.swornInDate.getTime());
        
        let totalSessionsRelevant = 0;
        let sessionsAttended = 0;
        let sessionsAbsent = 0;
        
        for (const record of records) {
          const recordDate = new Date(record.sessionDate);
          const absentMpIds = new Set(record.absentMpIds || []);
          
          // Find the MP who was representing this constituency at the time of this session
          // MP's term is active if: sessionDate >= swornInDate AND (termEndDate is null OR sessionDate <= termEndDate)
          const activeMp = sortedMps.find(mp => {
            const swornIn = mp.swornInDate;
            const termEnd = mp.termEndDate;
            const isAfterSwornIn = recordDate >= swornIn;
            const isBeforeTermEnd = !termEnd || recordDate <= termEnd;
            return isAfterSwornIn && isBeforeTermEnd;
          });
          
          if (activeMp) {
            totalSessionsRelevant++;
            if (absentMpIds.has(activeMp.id)) {
              sessionsAbsent++;
            } else {
              sessionsAttended++;
            }
          }
        }
        
        const attendanceRate = totalSessionsRelevant > 0 
          ? (sessionsAttended / totalSessionsRelevant) * 100 
          : 0;
        
        return {
          constituency: data.constituency,
          state: data.state,
          currentMps: sortedMps,
          totalSessions: totalSessionsRelevant,
          sessionsAttended,
          sessionsAbsent,
          attendanceRate
        };
      });
      
      // Apply filters
      let filteredData = constituencyData;
      
      if (party && typeof party === 'string') {
        // Filter by the current (most recent) MP's party
        filteredData = filteredData.filter(c => 
          c.currentMps.length > 0 && c.currentMps[0].party === party
        );
      }
      
      if (state && typeof state === 'string') {
        filteredData = filteredData.filter(c => c.state === state);
      }
      
      // Sort by attendance rate (worst to best)
      filteredData.sort((a, b) => a.attendanceRate - b.attendanceRate);
      
      res.json({
        totalConstituencies: filteredData.length,
        totalSessions: records.length,
        constituencies: filteredData
      });
    } catch (error) {
      console.error("Error fetching constituency attendance history:", error);
      res.status(500).json({ error: "Failed to fetch constituency attendance history" });
    }
  });

  // Get attendance report across all Hansard sessions
  app.get("/api/attendance/report", async (req, res) => {
    try {
      const { startDate, endDate, party, state } = req.query;
      
      let records = await storage.getAllHansardRecords();
      const allMps = await storage.getAllMps();
      
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        records = records.filter(r => new Date(r.sessionDate) >= start);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        records = records.filter(r => new Date(r.sessionDate) <= end);
      }
      
      let filteredMps = allMps;
      if (party && typeof party === 'string') {
        filteredMps = filteredMps.filter(mp => mp.party === party);
      }
      
      if (state && typeof state === 'string') {
        filteredMps = filteredMps.filter(mp => mp.state === state);
      }
      
      if (filteredMps.length === 0) {
        return res.json({
          summary: {
            totalSessions: 0,
            averageAbsent: 0,
            averageAttendanceRate: 0,
            totalMpsTracked: 0
          },
          sessions: []
        });
      }
      
      const reportData = records.map(record => {
        const absentMpIds = record.absentMpIds || [];
        const mpIdMap = new Map(allMps.map(mp => [mp.id, mp]));
        
        const absentMps = absentMpIds
          .map(id => mpIdMap.get(id))
          .filter((mp): mp is NonNullable<typeof mp> => mp !== undefined)
          .filter(mp => filteredMps.some(fmp => fmp.id === mp.id));
        
        const attendedMps = filteredMps.filter(mp => !absentMpIds.includes(mp.id));
        
        return {
          id: record.id,
          sessionNumber: record.sessionNumber,
          sessionDate: record.sessionDate,
          parliamentTerm: record.parliamentTerm,
          sitting: record.sitting,
          totalAbsent: absentMps.length,
          totalSpeakers: record.speakers.length,
          attendanceRate: filteredMps.length > 0 
            ? (attendedMps.length / filteredMps.length) * 100 
            : 0,
          absentMps: absentMps.map(mp => ({
            id: mp.id,
            name: mp.name,
            party: mp.party,
            state: mp.state,
            constituency: mp.constituency
          }))
        };
      }).sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
      
      const totalSessions = reportData.length;
      const avgAbsent = totalSessions > 0 
        ? reportData.reduce((sum, r) => sum + r.totalAbsent, 0) / totalSessions 
        : 0;
      const avgAttendanceRate = totalSessions > 0
        ? reportData.reduce((sum, r) => sum + r.attendanceRate, 0) / totalSessions
        : 0;
      
      res.json({
        summary: {
          totalSessions,
          averageAbsent: Math.round(avgAbsent * 10) / 10,
          averageAttendanceRate: Math.round(avgAttendanceRate * 10) / 10,
          totalMpsTracked: filteredMps.length
        },
        sessions: reportData
      });
    } catch (error) {
      console.error("Error generating attendance report:", error);
      res.status(500).json({ error: "Failed to generate attendance report" });
    }
  });

  // Delete all Hansard records
  app.delete("/api/hansard-records", async (_req, res) => {
    try {
      const count = await storage.deleteAllHansardRecords();
      res.json({ deletedCount: count });
    } catch (error) {
      console.error("Error deleting all Hansard records:", error);
      res.status(500).json({ error: "Failed to delete all Hansard records" });
    }
  });

  // Reprocess attendance for all or selected Hansard records
  app.post("/api/hansard-records/reprocess-attendance", async (req, res) => {
    try {
      const { limit, recordIds } = req.body;
      const scraper = new HansardScraper();
      
      let records = await storage.getAllHansardRecords();
      
      if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
        records = records.filter(r => recordIds.includes(r.id));
      }
      
      if (limit && typeof limit === 'number' && limit > 0) {
        records = records.slice(0, limit);
      }

      console.log(`Starting attendance reprocessing for ${records.length} records...`);
      
      let processed = 0;
      let updated = 0;
      let errors = 0;
      const results: Array<{
        id: string;
        sessionNumber: string;
        status: string;
        counts?: ConstituencyAttendanceCounts;
        error?: string;
      }> = [];

      for (const record of records) {
        processed++;
        
        if (!record.pdfLinks || record.pdfLinks.length === 0) {
          console.log(`[${processed}/${records.length}] ${record.sessionNumber}: No PDF links`);
          results.push({
            id: record.id,
            sessionNumber: record.sessionNumber,
            status: 'skipped',
            error: 'No PDF links'
          });
          continue;
        }

        try {
          console.log(`[${processed}/${records.length}] Reprocessing ${record.sessionNumber}...`);
          
          const pdfText = await scraper.downloadAndExtractPdf(record.pdfLinks[0]);
          
          if (!pdfText) {
            console.log(`  ✗ Failed to extract PDF`);
            errors++;
            results.push({
              id: record.id,
              sessionNumber: record.sessionNumber,
              status: 'error',
              error: 'Failed to extract PDF'
            });
            continue;
          }

          const counts = scraper.extractConstituencyAttendanceCounts(pdfText);
          
          await storage.updateHansardRecord(record.id, {
            constituenciesPresent: counts.constituenciesPresent,
            constituenciesAbsent: counts.constituenciesAbsent,
            constituenciesAbsentRule91: counts.constituenciesAbsentRule91
          });
          
          console.log(`  ✓ Updated: ${counts.constituenciesPresent} present, ${counts.constituenciesAbsent} absent, ${counts.constituenciesAbsentRule91} absent (Rule 91)`);
          updated++;
          results.push({
            id: record.id,
            sessionNumber: record.sessionNumber,
            status: 'success',
            counts
          });
        } catch (error) {
          console.error(`  ✗ Error processing ${record.sessionNumber}:`, error);
          errors++;
          results.push({
            id: record.id,
            sessionNumber: record.sessionNumber,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`\n=== Reprocessing Summary ===`);
      console.log(`Total records: ${records.length}`);
      console.log(`Successfully updated: ${updated}`);
      console.log(`Errors: ${errors}`);

      res.json({
        totalRecords: records.length,
        processed,
        updated,
        errors,
        results
      });
    } catch (error) {
      console.error("Error reprocessing attendance:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to reprocess attendance" 
      });
    }
  });

  // Trigger Hansard download (background job)
  app.post("/api/hansard-records/download", async (req, res) => {
    try {
      const { maxRecords = 500, deleteExisting = false } = req.body;
      
      // Create a background job
      const jobId = jobTracker.createJob(maxRecords, 'Initializing Hansard download...');
      
      // Start the background job (don't await it)
      runHansardDownloadJob(jobId, maxRecords, deleteExisting).catch(error => {
        console.error('[Background Job] Uncaught error:', error);
      });
      
      // Return immediately with the job ID
      res.json({
        jobId,
        message: 'Download started in background',
        statusUrl: `/api/jobs/${jobId}`
      });
    } catch (error) {
      console.error("Error starting Hansard download job:", error);
      res.status(500).json({ error: "Failed to start download job" });
    }
  });

  // Get job status
  app.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = jobTracker.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  // Get all jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = jobTracker.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Increment page view count
  app.post("/api/page-views", async (req, res) => {
    try {
      const { page } = req.body;
      if (!page) {
        return res.status(400).json({ error: "Page name is required" });
      }
      const count = await storage.incrementPageView(page);
      res.json({ count });
    } catch (error) {
      console.error("Error incrementing page view:", error);
      res.status(500).json({ error: "Failed to increment page view" });
    }
  });

  // Get page view count
  app.get("/api/page-views/:page", async (req, res) => {
    try {
      const { page } = req.params;
      const count = await storage.getPageViewCount(page);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching page view count:", error);
      res.status(500).json({ error: "Failed to fetch page view count" });
    }
  });

  // Summarize text with Hugging Face mT5 (supports Malay and English)
  app.post("/api/summarize", async (req, res) => {
    try {
      const { text, language } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const validLanguages = ['malay', 'english'];
      const targetLanguage = language?.toLowerCase() || 'english';
      
      if (!validLanguages.includes(targetLanguage)) {
        return res.status(400).json({ error: "Language must be 'malay' or 'english'" });
      }

      const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
      
      if (!HUGGINGFACE_API_KEY) {
        return res.status(500).json({ error: "Hugging Face API key not configured" });
      }

      // Prepend language instruction to guide the model
      const languageInstruction = targetLanguage === 'malay' 
        ? "Ringkaskan dalam Bahasa Malaysia: " 
        : "Summarize in English: ";
      
      const inputText = languageInstruction + text;

      // Use mT5 model for multilingual summarization
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/csebuetnlp/mT5_multilingual_XLSum",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: inputText,
            parameters: {
              max_length: 150,
              min_length: 30,
              do_sample: false,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error:", errorText);
        
        // Check if model is loading
        if (response.status === 503) {
          return res.status(503).json({ 
            error: "Model is loading. Please try again in a moment.",
            retry: true 
          });
        }
        
        return res.status(response.status).json({ 
          error: "Failed to generate summary",
          details: errorText 
        });
      }

      const result = await response.json();
      
      // The API returns an array with summary_text
      const summary = Array.isArray(result) && result[0]?.summary_text 
        ? result[0].summary_text 
        : result.summary_text || "Summary not available";

      res.json({ 
        summary,
        language: targetLanguage,
        originalLength: text.length,
        summaryLength: summary.length
      });
    } catch (error) {
      console.error("Error in summarization:", error);
      res.status(500).json({ error: "Failed to summarize text" });
    }
  });

  // Admin endpoint to manually trigger database seeding (for Railway/production)
  app.post("/api/admin/seed", requireAuth, async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(400).json({ error: "No database configured - using in-memory storage" });
      }
      
      console.log("Manual seed triggered via API...");
      await seedDatabase();
      
      // Get stats to verify
      const allMps = await storage.getAllMps();
      const hansardRecords = await storage.getAllHansardRecords();
      const recordsWithAbsent = hansardRecords.filter(r => r.absentMpIds && r.absentMpIds.length > 0);
      
      const stats = {
        totalMps: allMps.length,
        totalHansardRecords: hansardRecords.length,
        recordsWithAbsentData: recordsWithAbsent.length,
        sampleAbsentCounts: recordsWithAbsent.slice(0, 3).map(r => ({
          session: r.sessionNumber,
          absentCount: r.absentMpIds?.length || 0,
          attendedCount: r.attendedMpIds?.length || 0
        }))
      };
      
      console.log("Seed completed. Stats:", JSON.stringify(stats, null, 2));
      
      res.json({ 
        message: "Database seeded successfully",
        stats
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ error: "Failed to seed database", details: String(error) });
    }
  });

  // Admin endpoint to verify database state
  app.get("/api/admin/db-status", requireAuth, async (req, res) => {
    try {
      const allMps = await storage.getAllMps();
      const hansardRecords = await storage.getAllHansardRecords();
      const recordsWithAbsent = hansardRecords.filter(r => r.absentMpIds && r.absentMpIds.length > 0);
      
      res.json({
        usingDatabase: !!process.env.DATABASE_URL,
        totalMps: allMps.length,
        totalHansardRecords: hansardRecords.length,
        recordsWithAbsentData: recordsWithAbsent.length,
        sampleRecords: hansardRecords.slice(0, 2).map(r => ({
          session: r.sessionNumber,
          date: r.sessionDate,
          absentMpIds: r.absentMpIds || [],
          absentCount: r.absentMpIds?.length || 0,
          attendedMpIds: r.attendedMpIds || [],
          attendedCount: r.attendedMpIds?.length || 0
        }))
      });
    } catch (error) {
      console.error("Error checking database status:", error);
      res.status(500).json({ error: "Failed to check database status", details: String(error) });
    }
  });

  // Sitemap.xml endpoint for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://myparliament.calmic.com.my";
      
      const allMps = await storage.getAllMps();
      const today = new Date().toISOString().split('T')[0];
      
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Static pages with priorities
      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'weekly' },
        { url: '/activity', priority: '0.8', changefreq: 'weekly' },
        { url: '/hansard', priority: '0.8', changefreq: 'weekly' },
        { url: '/attendance', priority: '0.8', changefreq: 'weekly' },
        { url: '/allowances', priority: '0.7', changefreq: 'monthly' }
      ];
      
      for (const page of staticPages) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += '  </url>\n';
      }
      
      // Individual MP profile pages
      for (const mp of allMps) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/mp/${mp.id}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.6</priority>\n`;
        sitemap += '  </url>\n';
      }
      
      sitemap += '</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Admin endpoint to manually trigger Hansard sync
  app.post("/api/admin/trigger-hansard-check", requireAuth, async (req, res) => {
    try {
      console.log("Manual Hansard sync triggered via API...");
      const result = await runHansardSync({ triggeredBy: 'manual' });

      res.json({
        message: "Hansard sync completed",
        result: {
          triggeredBy: result.triggeredBy,
          startTime: result.startTime,
          endTime: result.endTime,
          durationMs: result.durationMs,
          lastKnownSession: result.lastKnownSession,
          recordsFound: result.recordsFound,
          recordsInserted: result.recordsInserted,
          recordsSkipped: result.recordsSkipped,
          errorCount: result.errors.length,
          errors: result.errors
        }
      });
    } catch (error) {
      console.error("Error triggering Hansard sync:", error);
      res.status(500).json({ error: "Failed to trigger Hansard sync", details: String(error) });
    }
  });

  // Admin endpoint to refresh all MP data (attendance, speeches, Hansard performance)
  app.post("/api/admin/refresh-mp-data", requireAuth, async (req, res) => {
    try {
      console.log("Manual MP data refresh triggered via API...");
      const { refreshAllMpData } = await import('./aggregate-speeches');
      const results = await refreshAllMpData();

      res.json({
        message: "MP data refreshed successfully",
        results: {
          attendance: {
            mpsUpdated: results.attendance.totalMpsUpdated,
            recordsProcessed: results.attendance.totalRecordsProcessed
          },
          speeches: {
            mpsUpdated: results.speeches.totalMpsUpdated,
            mpsWithNoSpeeches: results.speeches.mpsWithNoSpeeches,
            recordsProcessed: results.speeches.totalRecordsProcessed,
            recordsWithSpeakers: results.speeches.recordsWithSpeakers,
            recordsWithoutSpeakers: results.speeches.recordsWithoutSpeakers,
            skippedSessions: results.speeches.skippedSessions
          }
        }
      });
    } catch (error) {
      console.error("Error refreshing MP data:", error);
      res.status(500).json({ error: "Failed to refresh MP data", details: String(error) });
    }
  });

  // Admin endpoint to re-extract Bills, Motions, and Questions from existing Hansard records
  app.post("/api/admin/reextract-activities", requireAuth, async (req, res) => {
    try {
      console.log("🔄 Re-extracting Bills, Motions, and Questions from Hansard records...");
      
      // Import parsers and schema
      const { HansardSectionParser } = await import('./hansard-section-parser');
      const { HansardQuestionParser } = await import('./hansard-question-parser');
      const { HansardBillMotionParser } = await import('./hansard-bill-motion-parser');
      const { legislativeProposals, debateParticipations, parliamentaryQuestions } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Get all MPs for parser initialization
      const allMps = await db.select().from(mps);
      
      // Initialize parsers
      const sectionParser = new HansardSectionParser();
      const questionParser = new HansardQuestionParser(allMps);
      const billMotionParser = new HansardBillMotionParser(allMps);
      
      // Get all Hansard records
      const allRecords = await db.select().from(hansardRecords);
      console.log(`📊 Found ${allRecords.length} Hansard records to process`);
      
      // Track statistics
      let recordsProcessed = 0;
      let totalBills = 0;
      let totalMotions = 0;
      let totalQuestions = 0;
      let billsWithMpMatch = 0;
      let motionsWithMpMatch = 0;
      let questionsWithMpMatch = 0;
      let skippedRecords = 0;
      const errors: string[] = [];
      
      // Use a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Step 1: Clear existing activities (they will be re-extracted)
        console.log("🗑️  Clearing existing activities...");
        await tx.delete(legislativeProposals);
        await tx.delete(parliamentaryQuestions);
        // Note: debateParticipations are not currently extracted from transcripts, so we don't clear them
        console.log("✅ Existing activities cleared");
        
        // Step 2: Re-extract from each Hansard record
        for (const record of allRecords) {
          try {
            const transcript = record.transcript as string;
            if (!transcript || transcript.length < 100) {
              console.warn(`⚠️  Skipping ${record.sessionNumber} - No transcript data`);
              skippedRecords++;
              continue;
            }
            
            console.log(`📄 Processing ${record.sessionNumber}...`);
            
            // Parse sections
            const sections = sectionParser.parseSections(transcript);
            
            // Extract questions from question sections
            for (const section of sections) {
              if (section.type === 'questions_oral') {
                const questions = questionParser.parseQuestions(section.content, 'oral');
                for (const q of questions) {
                  // Only insert if MP ID is matched - skip unmatched questions to avoid data corruption
                  if (q.mpId) {
                    await tx.insert(parliamentaryQuestions).values({
                      mpId: q.mpId,
                      questionText: q.questionText,
                      dateAsked: record.sessionDate,
                      ministry: q.ministry,
                      topic: q.topic,
                      answerStatus: q.answerStatus,
                      hansardReference: record.sessionNumber,
                      questionType: 'oral',
                      questionNumber: q.questionNumber,
                      hansardRecordId: record.id
                    });
                    totalQuestions++;
                    questionsWithMpMatch++;
                  } else {
                    totalQuestions++;
                  }
                }
              } else if (section.type === 'questions_written') {
                const questions = questionParser.parseQuestions(section.content, 'written');
                for (const q of questions) {
                  if (q.mpId) {
                    await tx.insert(parliamentaryQuestions).values({
                      mpId: q.mpId,
                      questionText: q.questionText,
                      dateAsked: record.sessionDate,
                      ministry: q.ministry,
                      topic: q.topic,
                      answerStatus: q.answerStatus,
                      hansardReference: record.sessionNumber,
                      questionType: 'written',
                      questionNumber: q.questionNumber,
                      hansardRecordId: record.id
                    });
                    totalQuestions++;
                    questionsWithMpMatch++;
                  } else {
                    totalQuestions++;
                  }
                }
              } else if (section.type === 'questions_minister') {
                const questions = questionParser.parseQuestions(section.content, 'minister');
                for (const q of questions) {
                  if (q.mpId) {
                    await tx.insert(parliamentaryQuestions).values({
                      mpId: q.mpId,
                      questionText: q.questionText,
                      dateAsked: record.sessionDate,
                      ministry: q.ministry,
                      topic: q.topic,
                      answerStatus: q.answerStatus,
                      hansardReference: record.sessionNumber,
                      questionType: 'minister',
                      questionNumber: q.questionNumber,
                      hansardRecordId: record.id
                    });
                    totalQuestions++;
                    questionsWithMpMatch++;
                  } else {
                    totalQuestions++;
                  }
                }
              } else if (section.type === 'bill') {
                const bills = billMotionParser.parseBills(section.content);
                for (const bill of bills) {
                  if (bill.mpId) {
                    await tx.insert(legislativeProposals).values({
                      mpId: bill.mpId,
                      title: bill.title,
                      type: 'Bill',
                      dateProposed: record.sessionDate,
                      status: bill.status,
                      description: bill.description,
                      hansardReference: record.sessionNumber,
                      billNumber: bill.billNumber,
                      coSponsors: bill.coSponsors || [],
                      hansardRecordId: record.id
                    });
                    totalBills++;
                    billsWithMpMatch++;
                  } else {
                    totalBills++;
                  }
                }
              } else if (section.type === 'motion') {
                const motions = billMotionParser.parseMotions(section.content);
                for (const motion of motions) {
                  if (motion.mpId) {
                    await tx.insert(legislativeProposals).values({
                      mpId: motion.mpId,
                      title: motion.title,
                      type: 'Motion',
                      dateProposed: record.sessionDate,
                      status: motion.status,
                      description: motion.description,
                      hansardReference: record.sessionNumber,
                      coSponsors: motion.coSponsors || [],
                      hansardRecordId: record.id
                    });
                    totalMotions++;
                    motionsWithMpMatch++;
                  } else {
                    totalMotions++;
                  }
                }
              }
            }
            
            recordsProcessed++;
          } catch (error) {
            console.error(`❌ Error processing ${record.sessionNumber}:`, error);
            errors.push(`${record.sessionNumber}: ${String(error)}`);
            // Don't throw - continue processing other records
          }
        }
      });
      
      console.log("✅ Re-extraction complete!");
      console.log(`   - Records processed: ${recordsProcessed}/${allRecords.length}`);
      console.log(`   - Records skipped: ${skippedRecords}`);
      console.log(`   - Bills extracted: ${totalBills} (${billsWithMpMatch} with MP match)`);
      console.log(`   - Motions extracted: ${totalMotions} (${motionsWithMpMatch} with MP match)`);
      console.log(`   - Questions extracted: ${totalQuestions} (${questionsWithMpMatch} with MP match)`);
      
      res.json({
        message: "Activities re-extracted successfully",
        results: {
          recordsProcessed,
          totalRecords: allRecords.length,
          skippedRecords,
          bills: {
            total: totalBills,
            withMpMatch: billsWithMpMatch,
            withoutMpMatch: totalBills - billsWithMpMatch,
            matchRate: totalBills > 0 ? ((billsWithMpMatch / totalBills) * 100).toFixed(1) + '%' : '0%'
          },
          motions: {
            total: totalMotions,
            withMpMatch: motionsWithMpMatch,
            withoutMpMatch: totalMotions - motionsWithMpMatch,
            matchRate: totalMotions > 0 ? ((motionsWithMpMatch / totalMotions) * 100).toFixed(1) + '%' : '0%'
          },
          questions: {
            total: totalQuestions,
            withMpMatch: questionsWithMpMatch,
            withoutMpMatch: totalQuestions - questionsWithMpMatch,
            matchRate: totalQuestions > 0 ? ((questionsWithMpMatch / totalQuestions) * 100).toFixed(1) + '%' : '0%'
          },
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error list to first 10
        }
      });
    } catch (error) {
      console.error("Error re-extracting activities:", error);
      res.status(500).json({ error: "Failed to re-extract activities", details: String(error) });
    }
  });

  // Diagnostic endpoint to identify Hansard records with missing speaker data
  app.get("/api/admin/hansard-diagnostics", requireAuth, async (req, res) => {
    try {
      const allRecords = await db.select({
        id: hansardRecords.id,
        sessionNumber: hansardRecords.sessionNumber,
        sessionDate: hansardRecords.sessionDate,
        speakerStats: hansardRecords.speakerStats,
        attendedMpIds: hansardRecords.attendedMpIds
      }).from(hansardRecords);

      const withSpeakers = [];
      const withoutSpeakers = [];

      for (const record of allRecords) {
        const stats = record.speakerStats as any[] || [];
        const attended = record.attendedMpIds as any[] || [];
        
        if (stats.length === 0) {
          withoutSpeakers.push({
            id: record.id,
            sessionNumber: record.sessionNumber,
            sessionDate: record.sessionDate,
            attendedCount: attended.length,
            speakerCount: 0
          });
        } else {
          withSpeakers.push({
            sessionNumber: record.sessionNumber,
            sessionDate: record.sessionDate,
            attendedCount: attended.length,
            speakerCount: stats.length
          });
        }
      }

      // Sort by date
      withSpeakers.sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      withoutSpeakers.sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

      res.json({
        totalRecords: allRecords.length,
        recordsWithSpeakers: withSpeakers.length,
        recordsNeedingReprocessing: withoutSpeakers.length,
        percentageWithSpeakers: allRecords.length > 0 ? ((withSpeakers.length / allRecords.length) * 100).toFixed(1) : "0",
        problematicRecords: withoutSpeakers.map(r => ({
          id: r.id,
          sessionNumber: r.sessionNumber,
          date: r.sessionDate,
          attendedCount: r.attendedCount
        }))
      });
    } catch (error) {
      console.error("Error getting Hansard diagnostics:", error);
      res.status(500).json({ error: "Failed to get diagnostics", details: String(error) });
    }
  });

  // Endpoint to reprocess Hansard records without speaker stats
  app.post("/api/admin/reprocess-hansard-speakers", requireAuth, async (req, res) => {
    try {
      console.log("🔄 Reprocessing Hansard records without speaker stats...");
      
      // Get all Hansard records
      const allRecords = await db.select().from(hansardRecords);
      const recordsNeedingReprocessing = allRecords.filter(r => {
        const stats = r.speakerStats as any[] || [];
        return stats.length === 0;
      });

      if (recordsNeedingReprocessing.length === 0) {
        return res.json({
          message: "No records need reprocessing",
          processed: 0,
          total: allRecords.length
        });
      }

      console.log(`📊 Found ${recordsNeedingReprocessing.length} records without speaker stats`);

      // Get all MPs
      const allMps = await db.select().from(mps);
      const parser = new HansardPdfParser(allMps);
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const record of recordsNeedingReprocessing) {
        try {
          // Get the PDF file for this Hansard
          const pdfFile = await db.select().from(hansardPdfFiles)
            .where(eq(hansardPdfFiles.hansardRecordId, record.id))
            .limit(1);

          if (pdfFile.length === 0) {
            console.warn(`⚠️  No PDF found for ${record.sessionNumber}`);
            errors.push(`No PDF file for ${record.sessionNumber}`);
            errorCount++;
            continue;
          }

          console.log(`📄 Reprocessing ${record.sessionNumber}...`);
          
          // Re-parse the PDF
          const parsed = await parser.parseHansardPdf(pdfFile[0].pdfData);

          // Validate that parsing succeeded
          if (!parsed || !parsed.speakers || parsed.speakers.length === 0) {
            console.warn(`⚠️  Parsing produced no speakers for ${record.sessionNumber}`);
            errors.push(`${record.sessionNumber}: Parsing produced no speakers`);
            errorCount++;
            continue;
          }

          // Map speaker stats to the format needed for database
          const speakerStatsForDb = parsed.speakers.map((speaker, index) => ({
            mpId: speaker.mpId,
            mpName: speaker.mpName,
            totalSpeeches: parsed.allSpeakingInstances.filter(inst => inst.mpId === speaker.mpId).length,
            speakingOrder: speaker.speakingOrder
          }));

          // Validate we have valid speaker stats
          if (speakerStatsForDb.length === 0) {
            console.warn(`⚠️  No valid speaker stats for ${record.sessionNumber}`);
            errors.push(`${record.sessionNumber}: No valid speaker stats after parsing`);
            errorCount++;
            continue;
          }

          // Update the record with new speaker stats (only if parsing succeeded)
          await db.update(hansardRecords)
            .set({
              speakerStats: speakerStatsForDb,
              speakers: parsed.speakers,
              attendedMpIds: parsed.attendance.attendedMpIds,
              absentMpIds: parsed.attendance.absentMpIds
            })
            .where(eq(hansardRecords.id, record.id));

          console.log(`✅ Updated ${record.sessionNumber} - ${parsed.speakers.length} speakers found`);
          successCount++;
        } catch (error) {
          console.error(`❌ Error reprocessing ${record.sessionNumber}:`, error);
          errors.push(`${record.sessionNumber}: ${String(error)}`);
          errorCount++;
        }
      }

      console.log(`✅ Reprocessing complete: ${successCount} success, ${errorCount} errors`);

      // If we successfully reprocessed any records, trigger MP data refresh
      if (successCount > 0) {
        try {
          console.log("🔄 Triggering MP data refresh after reprocessing...");
          const refreshResult = await refreshMpDataFromHansards();
          console.log(`✅ MP data refreshed: ${refreshResult.attendance.mpsUpdated} MPs updated`);
        } catch (refreshError) {
          console.error("⚠️  Failed to auto-refresh MP data after reprocessing:", refreshError);
          // Don't fail the whole request if refresh fails
        }
      }

      res.json({
        message: successCount > 0 ? "Reprocessing complete - MP data refreshed" : "Reprocessing complete",
        total: recordsNeedingReprocessing.length,
        successCount,
        errorCount,
        errors: errorCount > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error reprocessing Hansards:", error);
      res.status(500).json({ error: "Failed to reprocess", details: String(error) });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
