import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import multer from "multer";
import { 
  insertCourtCaseSchema, 
  insertSprmInvestigationSchema, 
  updateSprmInvestigationSchema,
  insertLegislativeProposalSchema,
  insertDebateParticipationSchema,
  insertParliamentaryQuestionSchema,
  insertHansardRecordSchema,
  updateHansardRecordSchema,
  mps
} from "@shared/schema";
import { HansardScraper, ConstituencyAttendanceCounts } from "./hansard-scraper";
import { MPNameMatcher } from "./mp-name-matcher";
import { runHansardSync } from "./hansard-cron";
import { HansardPdfParser } from "./hansard-pdf-parser";
import { db } from "./db";
import { jobTracker } from "./job-tracker";
import { runHansardDownloadJob } from "./hansard-background-jobs";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
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
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
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

// Authentication Middleware
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      req.session.userId = user.id;
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }
        
        res.json({ 
          success: true,
          user: { 
            id: user.id, 
            username: user.username,
            isAdmin: user.isAdmin 
          } 
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/check", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ authenticated: false });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ authenticated: false });
      }
      
      res.json({ 
        authenticated: true,
        user: { 
          id: user.id, 
          username: user.username,
          isAdmin: user.isAdmin 
        } 
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to verify authentication" });
    }
  });

  // Get all MPs
  app.get("/api/mps", async (_req, res) => {
    try {
      const mps = await storage.getAllMps();
      const hansardRecords = await storage.getAllHansardRecords();
      
      // Calculate speaking participation for each MP
      const mpsWithSpeaking = mps.map(mp => {
        const sessionsSpoke = hansardRecords.filter(record => 
          record.speakers && record.speakers.some(speaker => speaker.mpId === mp.id)
        ).length;
        
        return {
          ...mp,
          hansardSessionsSpoke: sessionsSpoke
        };
      });
      
      res.json(mpsWithSpeaking);
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
      
      res.json(mp);
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
      
      res.json(records);
    } catch (error) {
      console.error("Error searching Hansard records:", error);
      res.status(500).json({ error: "Failed to search Hansard records" });
    }
  });

  // Get all Hansard records
  app.get("/api/hansard-records", async (_req, res) => {
    try {
      const records = await storage.getAllHansardRecords();
      res.json(records);
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
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching Hansard record:", error);
      res.status(500).json({ error: "Failed to fetch Hansard record" });
    }
  });

  // Get Hansard records by session number
  app.get("/api/hansard-records/session/:sessionNumber", async (req, res) => {
    try {
      const { sessionNumber } = req.params;
      const records = await storage.getHansardRecordsBySessionNumber(sessionNumber);
      res.json(records);
    } catch (error) {
      console.error("Error fetching Hansard records by session:", error);
      res.status(500).json({ error: "Failed to fetch Hansard records by session" });
    }
  });

  // Upload and parse Hansard PDF
  app.post("/api/hansard-records/upload", requireAdmin, upload.single('pdf'), handleMulterError, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded. Only PDF files are accepted." });
      }

      console.log(`📤 Received PDF upload: ${req.file.originalname} (${req.file.size} bytes)`);

      // Get all MPs from database
      const allMps = await db.select().from(mps);
      
      // Parse the PDF
      const parser = new HansardPdfParser(allMps);
      const parsed = await parser.parseHansardPdf(req.file.buffer);

      // Create Hansard record
      const hansardData = {
        sessionNumber: parsed.metadata.sessionNumber,
        sessionDate: parsed.metadata.sessionDate,
        parliamentTerm: parsed.metadata.parliamentTerm,
        sitting: parsed.metadata.sitting,
        transcript: parsed.transcript,
        summary: `Parliamentary session ${parsed.metadata.sessionNumber} with ${parsed.speakers.length} speakers.`,
        summaryLanguage: 'en' as const,
        pdfLinks: [req.file.originalname],
        topics: parsed.topics,
        speakers: parsed.speakers,
        voteRecords: [],
        attendedMpIds: parsed.attendance.attendedMpIds,
        absentMpIds: parsed.attendance.absentMpIds,
        constituenciesPresent: parsed.attendance.attendedConstituencies.length,
        constituenciesAbsent: parsed.attendance.absentConstituencies.length,
      };

      const record = await storage.createHansardRecord(hansardData);

      // Update MP speaking statistics
      const speakerIds = parsed.speakers.map(s => s.mpId);
      for (const mpId of speakerIds) {
        const mp = allMps.find(m => m.id === mpId);
        if (mp) {
          const { eq } = await import("drizzle-orm");
          await db.update(mps)
            .set({ hansardSessionsSpoke: mp.hansardSessionsSpoke + 1 })
            .where(eq(mps.id, mpId));
        }
      }

      console.log(`✅ Successfully created Hansard record ${parsed.metadata.sessionNumber}`);

      res.status(201).json({
        success: true,
        sessionNumber: parsed.metadata.sessionNumber,
        speakersFound: parsed.speakers.length,
        unmatchedSpeakers: parsed.unmatchedSpeakers,
        attendedCount: parsed.attendance.attendedMpIds.length,
        absentCount: parsed.attendance.absentMpIds.length,
      });
    } catch (error) {
      console.error("Error processing Hansard PDF:", error);
      res.status(500).json({ 
        error: "Failed to process Hansard PDF", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Analyze Hansard PDF for specific MP speeches (transient analysis, no persistence)
  app.post("/api/hansard-analysis", upload.single('pdf'), handleMulterError, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded. Only PDF files are accepted." });
      }

      const mpId = req.body.mpId;
      if (!mpId) {
        return res.status(400).json({ error: "MP ID is required" });
      }

      console.log(`📊 Analyzing Hansard PDF: ${req.file.originalname} for MP: ${mpId}`);

      // Get all MPs from database
      const allMps = await db.select().from(mps);
      
      // Find target MP
      const targetMp = allMps.find(mp => mp.id === mpId);
      if (!targetMp) {
        return res.status(404).json({ error: "MP not found" });
      }

      // Parse using HansardPdfParser - uses canonical speaker identification
      const parser = new HansardPdfParser(allMps);
      const parsed = await parser.parseHansardPdf(req.file.buffer);

      // Filter unique speakers for target MP (deduplicated)
      const targetSpeakers = parsed.speakers.filter(s => s.mpId === mpId);

      // Use parser's canonical speaking instance data
      // Filter all instances for the target MP
      const allSpeechInstances = parsed.allSpeakingInstances
        .filter(inst => inst.mpId === mpId)
        .map(inst => ({
          position: inst.charOffsetStart || inst.lineNumber * 100, // Approximate position
          capturedName: inst.mpName,
          context: `Speaking instance ${inst.instanceNumber} at line ${inst.lineNumber}`,
          speakingOrder: inst.instanceNumber
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

  // Delete a Hansard record
  app.delete("/api/hansard-records/:id", requireAdmin, async (req, res) => {
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

  // Delete all Hansard records
  app.delete("/api/hansard-records", requireAdmin, async (_req, res) => {
    try {
      const count = await storage.deleteAllHansardRecords();
      res.json({ deletedCount: count });
    } catch (error) {
      console.error("Error deleting all Hansard records:", error);
      res.status(500).json({ error: "Failed to delete all Hansard records" });
    }
  });

  // Reprocess attendance for all or selected Hansard records
  app.post("/api/hansard-records/reprocess-attendance", requireAdmin, async (req, res) => {
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
  app.post("/api/hansard-records/download", requireAdmin, async (req, res) => {
    try {
      const { maxRecords = 200, deleteExisting = false } = req.body;
      
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
  app.get("/api/jobs/:jobId", requireAdmin, async (req, res) => {
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
  app.get("/api/jobs", requireAdmin, async (req, res) => {
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
  app.post("/api/admin/seed", async (req, res) => {
    try {
      // Require admin token for security
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ error: "Unauthorized - valid admin token required" });
      }
      
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
  app.get("/api/admin/db-status", async (req, res) => {
    try {
      // Require admin token for security
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ error: "Unauthorized - valid admin token required" });
      }
      
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
  app.post("/api/admin/trigger-hansard-check", async (req, res) => {
    try {
      // Require admin token for security
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ error: "Unauthorized - valid admin token required" });
      }

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

  const httpServer = createServer(app);

  return httpServer;
}
