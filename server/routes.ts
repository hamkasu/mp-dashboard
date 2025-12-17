/**
 * Copyright by Calmic Sdn Bhd
 */

import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
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
  insertBlogPostSchema,
  updateBlogPostSchema,
  insertUserFeedbackSchema,
  mps,
  hansardPdfFiles,
  hansardRecords,
  unmatchedSpeakers,
  insertUnmatchedSpeakerSchema,
  speakerMappings,
  insertSpeakerMappingSchema,
  parliamentaryQuestions,
  legislativeProposals,
  blogPosts,
  bills,
  billImpacts,
} from "@shared/schema";
import crypto from "crypto";
import { HansardScraper, ConstituencyAttendanceCounts } from "./hansard-scraper";
import { MPNameMatcher } from "./mp-name-matcher";
import { runHansardSync } from "./hansard-cron";
import { HansardPdfParser } from "./hansard-pdf-parser";
import { MemoryCache, startCacheCleanup } from "./cache";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { normalizeParliamentTerm } from "@shared/utils";
import { jobTracker } from "./job-tracker";
import { runHansardDownloadJob } from "./hansard-background-jobs";
import {
  mutationRateLimit,
  uploadRateLimit,
  auditLog as logAudit,
  auditMiddleware
} from "./middleware/security";
import { requireAdmin, getCurrentUsername } from "./simple-auth";
import { sendContactEmail, sendConfirmationEmail, isEmailConfigured } from "./email";
import { runBulkHansardAnalysis, getAnalysisJobStatus, cancelAnalysisJob } from "./hansard-ai-analyzer";
import { isAIConfigured } from "./ai-service";
import { insertSarawakDunMemberSchema } from "@shared/schema";

// Scraper function for Sarawak DUN members
async function scrapeSarawakDunMembers(): Promise<{ membersScraped: number; errors: number }> {
  try {
    const url = "https://duns.sarawak.gov.my/web/subpage/webpage_view/150";
    const response = await fetch(url);
    const html = await response.text();

    // Basic HTML parsing to extract member data
    // Looking for patterns like: N.1 OPAR, YB ENCIK BILLY ANAK SUJANG
    const memberPattern = /N\.(\d+)\s+([A-Z\s]+).*?YB\s+([^<]+)/gs;
    const matches = [...html.matchAll(memberPattern)];

    // Clear existing members
    await storage.deleteAllSarawakDunMembers();

    let membersScraped = 0;
    let errors = 0;

    // Extract members from HTML
    // Since the actual structure needs to be parsed properly, let's use a simpler approach
    // Looking for card-cell divs with member info
    const memberCardPattern = /<div class="card-cell"[^>]*>[\s\S]*?N\.(\d+)\s+([A-Z\s]+)[\s\S]*?YB\s+([^<]+)[\s\S]*?<\/div>/g;
    const cardMatches = [...html.matchAll(memberCardPattern)];

    for (const match of cardMatches) {
      try {
        const constituencyNumber = `N.${match[1]}`;
        const constituency = match[2].trim();
        const name = match[3].trim();

        await storage.createSarawakDunMember({
          name,
          constituency,
          constituencyNumber,
          party: "Unknown", // Will need to be extracted from detail pages
          photoUrl: null,
          profileUrl: null,
        });

        membersScraped++;
      } catch (error) {
        console.error("Error creating member:", error);
        errors++;
      }
    }

    // If no matches with the pattern above, try alternative extraction
    if (membersScraped === 0) {
      // Look for simpler patterns
      const simplePattern = /N\.(\d+)\s+([A-Z][A-Z\s]+)/g;
      const simpleMatches = [...html.matchAll(simplePattern)];

      for (const match of simpleMatches.slice(0, 82)) { // Sarawak has 82 seats
        try {
          const constituencyNumber = `N.${match[1]}`;
          const text = match[2].trim();

          await storage.createSarawakDunMember({
            name: "Member name not extracted",
            constituency: text.substring(0, 50),
            constituencyNumber,
            party: "Unknown",
            photoUrl: null,
            profileUrl: null,
          });

          membersScraped++;
        } catch (error) {
          console.error("Error creating member:", error);
          errors++;
        }
      }
    }

    return { membersScraped, errors };
  } catch (error) {
    console.error("Scraper error:", error);
    throw error;
  }
}

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

// Cache for pre-computed MP attendance statistics to avoid expensive recalculation
interface MpAttendanceStats {
  mpId: string;
  totalHansardSessions: number;
  hansardSessionsAttended: number;
  hansardSessionsSpoke: number;
  totalSpeechInstances: number;
}

let mpAttendanceCache: Map<string, MpAttendanceStats> | null = null;
let mpAttendanceCacheTime: number = 0;
const MP_ATTENDANCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function getMpAttendanceStats(storage: any): Promise<Map<string, MpAttendanceStats>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (mpAttendanceCache && (now - mpAttendanceCacheTime) < MP_ATTENDANCE_CACHE_TTL) {
    return mpAttendanceCache;
  }
  
  const mps = await storage.getAllMps();
  const hansardRecords = await storage.getAllHansardRecords();
  
  const statsMap = new Map<string, MpAttendanceStats>();
  
  for (const mp of mps) {
    const mpSwornInDate = new Date(mp.swornInDate).toISOString().split('T')[0];
    
    const relevantSessions = hansardRecords.filter((record: any) => {
      const sessionDate = new Date(record.sessionDate).toISOString().split('T')[0];
      return sessionDate >= mpSwornInDate;
    });
    
    const totalHansardSessions = relevantSessions.length;
    
    const sessionsAttended = relevantSessions.filter((record: any) => {
      if (record.attendedMpIds && record.attendedMpIds.length > 0) {
        return record.attendedMpIds.includes(mp.id);
      } else {
        return !record.absentMpIds || !record.absentMpIds.includes(mp.id);
      }
    }).length;
    
    const sessionsSpoke = relevantSessions.filter((record: any) => 
      (record.speakerStats && record.speakerStats.some((stat: any) => stat.mpId === mp.id)) ||
      (record.speakers && record.speakers.some((speaker: any) => speaker.mpId === mp.id))
    ).length;
    
    const totalSpeeches = relevantSessions.reduce((total: number, record: any) => {
      if (record.speakerStats) {
        const mpStat = record.speakerStats.find((stat: any) => stat.mpId === mp.id);
        if (mpStat && (mpStat as any).totalSpeeches) {
          return total + (mpStat as any).totalSpeeches;
        }
      }
      return total;
    }, 0);
    
    statsMap.set(mp.id, {
      mpId: mp.id,
      totalHansardSessions,
      hansardSessionsAttended: sessionsAttended,
      hansardSessionsSpoke: sessionsSpoke,
      totalSpeechInstances: totalSpeeches
    });
  }
  
  // Update cache
  mpAttendanceCache = statsMap;
  mpAttendanceCacheTime = now;
  
  // Clear references to allow GC
  return statsMap;
}

export async function registerRoutes(app: Express, httpServer: Server): Promise<void> {
  // Initialize caches for memory-intensive operations
  // Increased cache size for Replit's 32GB memory allocation
  const hansardSpeakersCache = new MemoryCache<{
    hansardRecordId: string;
    sessionNumber: string;
    speakers: any[];
  }>(500, 60); // 500MB cache, 60 minute expiry for 32GB RAM

  // Start automatic cleanup of expired cache entries every 5 minutes
  startCacheCleanup(hansardSpeakersCache, 5);
  
  // Paginated MPs endpoint - lighter weight than loading all MPs
  app.get("/api/mps/paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const sortBy = (req.query.sortBy as string) || 'name';
      const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
      const search = (req.query.search as string) || '';
      const parties = req.query.parties ? (req.query.parties as string).split(',') : [];
      const states = req.query.states ? (req.query.states as string).split(',') : [];
      const cabinetFilter = (req.query.cabinet as string) || 'all';
      const statusFilter = (req.query.status as string) || 'active';

      // Get all MPs (this is fast, just DB read)
      const allMps = await storage.getAllMps();
      
      // Get cached attendance stats (expensive calculation is cached)
      const attendanceStats = await getMpAttendanceStats(storage);
      
      // Apply filters
      let filteredMps = allMps.filter(mp => {
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch = 
            mp.name.toLowerCase().includes(searchLower) ||
            mp.constituency.toLowerCase().includes(searchLower) ||
            (mp.parliamentCode ?? '').toLowerCase().includes(searchLower) ||
            (mp.state ?? '').toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }
        
        // Party filter
        if (parties.length > 0 && !parties.includes(mp.party)) return false;
        
        // State filter
        if (states.length > 0 && !states.includes(mp.state)) return false;
        
        // Cabinet filter
        if (cabinetFilter !== 'all') {
          const role = (mp.role || '').toLowerCase();
          if (cabinetFilter === 'ministers') {
            if (!role.includes('minister') || role.includes('deputy')) return false;
          } else if (cabinetFilter === 'deputy-ministers') {
            if (!role.includes('deputy minister')) return false;
          } else if (cabinetFilter === 'cabinet') {
            if (!role.includes('minister')) return false;
          }
        }

        // Status filter (active vs former/deceased MPs)
        if (statusFilter !== 'all') {
          const now = new Date();
          const isFormer = mp.termEndDate && new Date(mp.termEndDate) <= now;
          if (statusFilter === 'active' && isFormer) return false;
          if (statusFilter === 'former' && !isFormer) return false;
        }

        return true;
      });
      
      // Apply sorting
      filteredMps.sort((a, b) => {
        const statsA = attendanceStats.get(a.id);
        const statsB = attendanceStats.get(b.id);
        
        let comparison = 0;
        
        switch (sortBy) {
          case 'attendance-best':
          case 'attendance-worst': {
            const totalA = statsA?.totalHansardSessions ?? a.totalParliamentDays;
            const attendedA = statsA?.hansardSessionsAttended ?? a.daysAttended;
            const totalB = statsB?.totalHansardSessions ?? b.totalParliamentDays;
            const attendedB = statsB?.hansardSessionsAttended ?? b.daysAttended;
            const rateA = totalA > 0 ? (attendedA / totalA) : 0;
            const rateB = totalB > 0 ? (attendedB / totalB) : 0;
            comparison = sortBy === 'attendance-best' ? rateB - rateA : rateA - rateB;
            break;
          }
          case 'speeches-most':
          case 'speeches-fewest': {
            const speechesA = statsA?.totalSpeechInstances ?? a.totalSpeechInstances;
            const speechesB = statsB?.totalSpeechInstances ?? b.totalSpeechInstances;
            comparison = sortBy === 'speeches-most' ? speechesB - speechesA : speechesA - speechesB;
            break;
          }
          default:
            comparison = a.name.localeCompare(b.name);
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Calculate pagination
      const totalItems = filteredMps.length;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;
      
      // Get page of MPs with their stats
      const paginatedMps = filteredMps.slice(offset, offset + limit).map(mp => {
        const stats = attendanceStats.get(mp.id);
        return {
          ...mp,
          totalHansardSessions: stats?.totalHansardSessions ?? 0,
          hansardSessionsAttended: stats?.hansardSessionsAttended ?? 0,
          hansardSessionsSpoke: stats?.hansardSessionsSpoke ?? 0,
          totalSpeechInstances: stats?.totalSpeechInstances ?? mp.totalSpeechInstances
        };
      });
      
      res.json({
        data: paginatedMps,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasMore: page < totalPages
        }
      });
    } catch (error) {
      console.error("Error fetching paginated MPs:", error);
      res.status(500).json({ error: "Failed to fetch MPs" });
    }
  });

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
        
        // Count sessions where MP attended
        // If attendedMpIds exists (new system), use explicit attendance tracking
        // Otherwise fall back to "not absent = attended" (old system)
        const sessionsAttended = relevantSessions.filter(record => {
          if (record.attendedMpIds && record.attendedMpIds.length > 0) {
            // New system: explicitly marked as attended
            return record.attendedMpIds.includes(mp.id);
          } else {
            // Old system: not marked as absent = attended
            return !record.absentMpIds || !record.absentMpIds.includes(mp.id);
          }
        }).length;
        
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
      
      // Count sessions where MP attended
      // If attendedMpIds exists (new system), use explicit attendance tracking
      // Otherwise fall back to "not absent = attended" (old system)
      const sessionsAttended = relevantSessions.filter(record => {
        if (record.attendedMpIds && record.attendedMpIds.length > 0) {
          // New system: explicitly marked as attended
          return record.attendedMpIds.includes(mp.id);
        } else {
          // Old system: not marked as absent = attended
          return !record.absentMpIds || !record.absentMpIds.includes(mp.id);
        }
      }).length;
      
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
      const allMps = await storage.getAllMps();

      // Filter to only include active MPs (not deceased or resigned)
      const now = new Date();
      const mps = allMps.filter(mp => {
        if (!mp.termEndDate) return true;
        return new Date(mp.termEndDate) > now;
      });

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

      // Calculate cumulative costs for ALL MPs (including deceased) since sworn in
      // For deceased MPs, calculate up to their termEndDate instead of current date
      const totalCumulativeCosts = allMps.reduce((sum, mp) => {
        const swornInDate = new Date(mp.swornInDate);

        // For deceased/resigned MPs, calculate up to their termEndDate
        // For active MPs, calculate up to now
        const endDate = mp.termEndDate ? new Date(mp.termEndDate) : now;

        const monthsSinceSwornIn = Math.max(
          0,
          (endDate.getFullYear() - swornInDate.getFullYear()) * 12 +
          (endDate.getMonth() - swornInDate.getMonth())
        );

        // Base salary and allowances per month
        const DEWAN_RAKYAT_SALARY = 25700;
        const MONTHLY_FIXED_ALLOWANCES = 2500 + 1500 + 1500 + 1500 + 300 + 1500 + 900; // Entertainment, special non-admin, fixed travel, fuel, toll, driver, phone (= 9,700)

        // Ministerial salaries (after 20% voluntary paycut)
        // Prime Minister takes no ministerial salary
        const DEPUTY_PRIME_MINISTER_SALARY = 18168.15;
        const MINISTER_SALARY = 14907.20;
        const DEPUTY_MINISTER_SALARY = 10847.65;

        const baseMonthlySalary = DEWAN_RAKYAT_SALARY;

        // Calculate ministerial salary based on role
        let ministerialSalary = 0;
        if (mp.role) {
          const roleLower = mp.role.toLowerCase();
          if (roleLower.includes("deputy prime minister") || roleLower.includes("timbalan perdana menteri")) {
            ministerialSalary = DEPUTY_PRIME_MINISTER_SALARY;
          } else if (roleLower.includes("deputy minister") || roleLower.includes("timbalan menteri")) {
            ministerialSalary = DEPUTY_MINISTER_SALARY;
          } else if (roleLower.includes("minister") || roleLower.includes("menteri")) {
            // Minister but not Prime Minister (PM takes no salary) or Deputy
            if (!roleLower.includes("prime minister") || roleLower.includes("deputy")) {
              ministerialSalary = MINISTER_SALARY;
            }
          }
        }

        // Total monthly recurring (including ministerial salary)
        const totalMonthly = baseMonthlySalary + ministerialSalary + MONTHLY_FIXED_ALLOWANCES;

        // Cumulative attendance-based allowances (lifetime)
        const PARLIAMENT_SITTING_PER_DAY = 400;
        const GOVERNMENT_MEETING_PER_DAY = 300;
        const parliamentSittingTotal = mp.daysAttended * PARLIAMENT_SITTING_PER_DAY;
        const governmentMeetingTotal = mp.governmentMeetingDays * GOVERNMENT_MEETING_PER_DAY;

        // Total cumulative cost for this MP
        const totalForMP = (totalMonthly * monthsSinceSwornIn) + parliamentSittingTotal + governmentMeetingTotal;

        return sum + totalForMP;
      }, 0);

      res.json({
        totalMps: mps.length,
        partyBreakdown: partyBreakdown.sort((a, b) => b.count - a.count),
        genderBreakdown,
        stateCount: uniqueStates.size,
        averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
        totalCumulativeCosts: Math.round(totalCumulativeCosts),
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
      res.status(500).json({ error: "Failed to calculate statistics" });
    }
  });

  // Get filtered statistics (for party/state filtering)
  app.get("/api/stats/filtered", async (req, res) => {
    try {
      const allMps = await storage.getAllMps();
      
      // Parse filter parameters
      const parties = req.query.parties ? (req.query.parties as string).split(',') : [];
      const states = req.query.states ? (req.query.states as string).split(',') : [];
      const cabinetFilter = req.query.cabinet as string | undefined;
      
      // Apply filters
      let filteredMps = allMps;
      
      if (parties.length > 0) {
        filteredMps = filteredMps.filter(mp => parties.includes(mp.party));
      }
      
      if (states.length > 0) {
        filteredMps = filteredMps.filter(mp => states.includes(mp.state));
      }
      
      if (cabinetFilter) {
        if (cabinetFilter === 'cabinet') {
          filteredMps = filteredMps.filter(mp => mp.isMinister || mp.isDeputyMinister);
        } else if (cabinetFilter === 'ministers') {
          filteredMps = filteredMps.filter(mp => mp.isMinister);
        } else if (cabinetFilter === 'deputy-ministers') {
          filteredMps = filteredMps.filter(mp => mp.isDeputyMinister);
        }
      }

      // Calculate gender breakdown
      const genderBreakdown = filteredMps.reduce((acc, mp) => {
        const existing = acc.find((g) => g.gender === mp.gender);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ gender: mp.gender, count: 1 });
        }
        return acc;
      }, [] as { gender: string; count: number }[]);

      // Calculate unique states
      const uniqueStates = new Set(filteredMps.map((mp) => mp.state));

      // Calculate average attendance
      const totalDaysAttended = filteredMps.reduce((sum, mp) => sum + mp.daysAttended, 0);
      const totalPossibleDays = filteredMps.reduce((sum, mp) => sum + mp.totalParliamentDays, 0);
      const averageAttendanceRate = totalPossibleDays > 0
        ? (totalDaysAttended / totalPossibleDays) * 100
        : 0;

      res.json({
        totalMps: filteredMps.length,
        genderBreakdown,
        stateCount: uniqueStates.size,
        averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
      });
    } catch (error) {
      console.error("Error calculating filtered stats:", error);
      res.status(500).json({ error: "Failed to calculate filtered statistics" });
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
  app.post("/api/court-cases", mutationRateLimit, auditMiddleware('court-case'), async (req, res) => {
    try {
      const validatedData = insertCourtCaseSchema.parse(req.body);
      
      // Validate that the MP exists to prevent orphaned records
      const mp = await storage.getMp(validatedData.mpId);
      if (!mp) {
        return res.status(400).json({ 
          error: "Invalid MP ID", 
          details: `MP with ID "${validatedData.mpId}" does not exist. Please use a valid MP ID.` 
        });
      }
      
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
  app.patch("/api/court-cases/:id", mutationRateLimit, auditMiddleware('court-case'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCourtCaseSchema.partial().parse(req.body);
      
      // If updating mpId, validate that the new MP exists
      if (validatedData.mpId) {
        const mp = await storage.getMp(validatedData.mpId);
        if (!mp) {
          return res.status(400).json({ 
            error: "Invalid MP ID", 
            details: `MP with ID "${validatedData.mpId}" does not exist. Please use a valid MP ID.` 
          });
        }
      }
      
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
  app.delete("/api/court-cases/:id", requireAdmin, mutationRateLimit, auditMiddleware('court-case'), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCourtCase(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Court case not found" });
      }
      
      res.json({ success: true, message: "Court case deleted successfully" });
    } catch (error) {
      console.error("Error deleting court case:", error);
      res.status(500).json({ error: "Failed to delete court case" });
    }
  });

  // ========== Sarawak DUN Endpoints ==========

  // Get all Sarawak DUN members
  app.get("/api/sarawak-dun/members", async (_req, res) => {
    try {
      const members = await storage.getAllSarawakDunMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching Sarawak DUN members:", error);
      res.status(500).json({ error: "Failed to fetch Sarawak DUN members" });
    }
  });

  // Get Sarawak DUN scraper status (admin only)
  app.get("/api/admin/sarawak-dun-scraper/status", requireAdmin, async (_req, res) => {
    try {
      const status = await storage.getSarawakDunScraperStatus();
      res.json(status || { isRunning: false, lastRunAt: null });
    } catch (error) {
      console.error("Error fetching scraper status:", error);
      res.status(500).json({ error: "Failed to fetch scraper status" });
    }
  });

  // Run Sarawak DUN scraper (admin only)
  app.post("/api/admin/sarawak-dun-scraper/run", requireAdmin, async (_req, res) => {
    try {
      // Check if scraper is already running
      const status = await storage.getSarawakDunScraperStatus();
      if (status?.isRunning) {
        return res.status(400).json({ error: "Scraper is already running" });
      }

      // Mark scraper as running
      await storage.setSarawakDunScraperStatus({ isRunning: true, lastRunAt: null });

      // Run scraper in background
      (async () => {
        try {
          const result = await scrapeSarawakDunMembers();
          await storage.setSarawakDunScraperStatus({
            isRunning: false,
            lastRunAt: new Date().toISOString(),
            lastRunResult: result
          });
        } catch (error) {
          console.error("Scraper error:", error);
          await storage.setSarawakDunScraperStatus({
            isRunning: false,
            lastRunAt: new Date().toISOString(),
            lastRunResult: { membersScraped: 0, errors: 1 }
          });
        }
      })();

      res.json({ message: "Scraper started", isRunning: true });
    } catch (error) {
      console.error("Error starting scraper:", error);
      res.status(500).json({ error: "Failed to start scraper" });
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
  app.post("/api/sprm-investigations", mutationRateLimit, auditMiddleware('sprm-investigation'), async (req, res) => {
    try {
      const validatedData = insertSprmInvestigationSchema.parse(req.body);
      
      // Validate that the MP exists to prevent orphaned records
      const mp = await storage.getMp(validatedData.mpId);
      if (!mp) {
        return res.status(400).json({ 
          error: "Invalid MP ID", 
          details: `MP with ID "${validatedData.mpId}" does not exist. Please use a valid MP ID.` 
        });
      }
      
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
  app.patch("/api/sprm-investigations/:id", mutationRateLimit, auditMiddleware('sprm-investigation'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateSprmInvestigationSchema.parse(req.body);
      
      // If updating mpId, validate that the new MP exists
      if (validatedData.mpId) {
        const mp = await storage.getMp(validatedData.mpId);
        if (!mp) {
          return res.status(400).json({ 
            error: "Invalid MP ID", 
            details: `MP with ID "${validatedData.mpId}" does not exist. Please use a valid MP ID.` 
          });
        }
      }
      
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
  app.delete("/api/sprm-investigations/:id", mutationRateLimit, auditMiddleware('sprm-investigation'), async (req, res) => {
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
  app.post("/api/legislative-proposals", mutationRateLimit, auditMiddleware('legislative-proposal'), async (req, res) => {
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
  app.patch("/api/legislative-proposals/:id", mutationRateLimit, auditMiddleware('legislative-proposal'), async (req, res) => {
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
  app.delete("/api/legislative-proposals/:id", mutationRateLimit, auditMiddleware('legislative-proposal'), async (req, res) => {
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
  app.post("/api/debate-participations", mutationRateLimit, auditMiddleware('debate-participation'), async (req, res) => {
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
  app.patch("/api/debate-participations/:id", mutationRateLimit, auditMiddleware('debate-participation'), async (req, res) => {
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
  app.delete("/api/debate-participations/:id", mutationRateLimit, auditMiddleware('debate-participation'), async (req, res) => {
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

  // Get oral answers count by MP ID
  app.get("/api/mps/:id/oral-answers-count", async (req, res) => {
    try {
      const { id } = req.params;
      const { parliamentaryOralAnswers } = await import("@shared/schema");
      const { eq, count: drizzleCount } = await import("drizzle-orm");

      // Count oral answers where this MP is the questioner
      const result = await db.select({ count: drizzleCount() })
        .from(parliamentaryOralAnswers)
        .where(eq(parliamentaryOralAnswers.questionerMpId, id));

      const totalCount = result[0]?.count || 0;
      res.json({ count: totalCount });
    } catch (error) {
      console.error("Error fetching oral answers count:", error);
      res.status(500).json({ error: "Failed to fetch oral answers count" });
    }
  });

  // Get oral answers list by MP ID (full details)
  app.get("/api/mps/:id/oral-answers", async (req, res) => {
    try {
      const { id } = req.params;
      const { parliamentaryOralAnswers } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      // Get all oral answers where this MP is the questioner
      const answers = await db.select()
        .from(parliamentaryOralAnswers)
        .where(eq(parliamentaryOralAnswers.questionerMpId, id))
        .orderBy(desc(parliamentaryOralAnswers.dateAsked));

      res.json(answers);
    } catch (error) {
      console.error("Error fetching oral answers:", error);
      res.status(500).json({ error: "Failed to fetch oral answers" });
    }
  });

  // Get oral answers counts for all MPs (grouped by MP ID)
  app.get("/api/oral-answers/counts-by-mp", async (_req, res) => {
    try {
      const { parliamentaryOralAnswers } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");

      // Get all oral answers grouped by questioner MP ID
      const results = await db
        .select({
          mpId: parliamentaryOralAnswers.questionerMpId,
          count: sql<number>`count(*)::int`,
        })
        .from(parliamentaryOralAnswers)
        .where(sql`${parliamentaryOralAnswers.questionerMpId} IS NOT NULL`)
        .groupBy(parliamentaryOralAnswers.questionerMpId);

      // Convert to map format: { mpId: count }
      const countsMap: Record<string, number> = {};
      results.forEach((result) => {
        if (result.mpId) {
          countsMap[result.mpId] = result.count;
        }
      });

      res.json(countsMap);
    } catch (error) {
      console.error("Error fetching oral answers counts:", error);
      res.status(500).json({ error: "Failed to fetch oral answers counts" });
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

  // Get MP absent session dates from Hansard records
  app.get("/api/mps/:id/absent-sessions", async (req, res) => {
    try {
      const { id } = req.params;

      const mp = await storage.getMp(id);
      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }

      // Get all Hansard records
      const allHansardRecords = await storage.getAllHansardRecords();
      
      // Filter records after MP was sworn in - ALL records count as parliament sessions
      const mpSwornInDate = new Date(mp.swornInDate);
      const relevantSessions = allHansardRecords.filter(record => {
        const sessionDate = new Date(record.sessionDate);
        return sessionDate >= mpSwornInDate;
      });
      
      // Categorize sessions into attended and absent
      const attendedSessions: Array<{ date: Date | string; sessionNumber: string }> = [];
      const absentSessions: Array<{ date: Date | string; sessionNumber: string }> = [];
      
      for (const record of relevantSessions) {
        const attendedMpIds = record.attendedMpIds || [];
        const absentMpIds = record.absentMpIds || [];
        const hasAttendanceData = attendedMpIds.length > 0;
        
        const sessionInfo = {
          date: record.sessionDate,
          sessionNumber: record.sessionNumber
        };
        
        if (attendedMpIds.includes(mp.id)) {
          // MP explicitly marked as attended
          attendedSessions.push(sessionInfo);
        } else if (absentMpIds.includes(mp.id)) {
          // MP explicitly marked as absent
          absentSessions.push(sessionInfo);
        } else if (hasAttendanceData) {
          // Attendance was recorded but MP is not in either list - count as absent
          absentSessions.push(sessionInfo);
        } else {
          // No attendance data for this session - give benefit of doubt
          attendedSessions.push(sessionInfo);
        }
      }
      
      // Return sorted list of session dates (newest first)
      const sortedAbsentSessions = absentSessions
        .map(session => ({
          date: session.date,
          sessionNumber: session.sessionNumber
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const sortedAttendedSessions = attendedSessions
        .map(session => ({
          date: session.date,
          sessionNumber: session.sessionNumber
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json({
        totalSessions: relevantSessions.length,
        totalAbsent: absentSessions.length,
        totalAttended: attendedSessions.length,
        absentSessions: sortedAbsentSessions,
        attendedSessions: sortedAttendedSessions
      });
    } catch (error) {
      console.error("Error fetching absent sessions:", error);
      res.status(500).json({ error: "Failed to fetch absent sessions" });
    }
  });

  // Send a message/contact request to an MP
  app.post("/api/mps/:id/contact", mutationRateLimit, async (req, res) => {
    try {
      const { id } = req.params;
      const { senderName, senderEmail, subject, message } = req.body;

      // Validate required fields
      if (!senderName || !senderEmail || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(senderEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Get the MP to verify they exist
      const mp = await storage.getMp(id);
      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }

      // Log the contact request
      console.log(`[MP Contact] Message to ${mp.name} (${mp.constituency})`);
      console.log(`  From: ${senderName} <${senderEmail}>`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Message: ${message.substring(0, 100)}...`);

      // Send email via SendGrid if configured
      let emailSent = false;
      if (isEmailConfigured()) {
        const emailParams = {
          mpName: mp.name,
          mpEmail: mp.email,
          mpConstituency: mp.constituency,
          senderName,
          senderEmail,
          subject,
          message,
        };

        // Send email to MP's office
        const result = await sendContactEmail(emailParams);
        emailSent = result.success;

        // Send confirmation to constituent (don't block on failure)
        sendConfirmationEmail(emailParams).catch(err => {
          console.error("[Email] Failed to send confirmation:", err);
        });
      }

      res.json({
        success: true,
        emailSent,
        message: emailSent
          ? "Your message has been sent to the MP's office."
          : "Your message has been received and logged. Email delivery is not configured.",
        mpName: mp.name,
        mpEmail: mp.email
      });
    } catch (error) {
      console.error("Error sending contact message:", error);
      res.status(500).json({ error: "Failed to send message" });
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
  app.post("/api/parliamentary-questions", mutationRateLimit, auditMiddleware('parliamentary-question'), async (req, res) => {
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
  app.patch("/api/parliamentary-questions/:id", mutationRateLimit, auditMiddleware('parliamentary-question'), async (req, res) => {
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
  app.delete("/api/parliamentary-questions/:id", mutationRateLimit, auditMiddleware('parliamentary-question'), async (req, res) => {
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
      
      // Check which records have PDFs attached
      const { eq, and } = await import("drizzle-orm");
      const recordsWithPdfStatus = await Promise.all(
        records.map(async (record) => {
          const [pdfFile] = await db.select({ id: hansardPdfFiles.id })
            .from(hansardPdfFiles)
            .where(and(
              eq(hansardPdfFiles.hansardRecordId, record.id),
              eq(hansardPdfFiles.isPrimary, true)
            ))
            .limit(1);
          
          return {
            ...fixHansardPdfUrls(record, req),
            hasPdf: !!pdfFile
          };
        })
      );
      
      res.json(recordsWithPdfStatus);
    } catch (error) {
      console.error("Error searching Hansard records:", error);
      res.status(500).json({ error: "Failed to search Hansard records" });
    }
  });

  // Get all Hansard records
  app.get("/api/hansard-records", async (req, res) => {
    try {
      // OPTIMIZATION: Fetch records with minimal columns (exclude large transcript and JSONB)
      const { eq, and, inArray, desc } = await import("drizzle-orm");

      // OPTIMIZATION: Optional pagination support
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 0; // 0 = no limit (backwards compatible)
      const offset = limit > 0 ? (page - 1) * limit : 0;

      let query = db
        .select({
          id: hansardRecords.id,
          sessionNumber: hansardRecords.sessionNumber,
          sessionDate: hansardRecords.sessionDate,
          parliamentTerm: hansardRecords.parliamentTerm,
          sitting: hansardRecords.sitting,
          summary: hansardRecords.summary,
          summaryLanguage: hansardRecords.summaryLanguage,
          summarizedAt: hansardRecords.summarizedAt,
          pdfLinks: hansardRecords.pdfLinks,
          topics: hansardRecords.topics,
          constituenciesPresent: hansardRecords.constituenciesPresent,
          constituenciesAbsent: hansardRecords.constituenciesAbsent,
          createdAt: hansardRecords.createdAt,
          // Exclude: transcript (can be huge), speakers, speakerStats, voteRecords, attendedMpIds, absentMpIds
        })
        .from(hansardRecords)
        .orderBy(desc(hansardRecords.sessionDate));

      if (limit > 0) {
        query = query.limit(limit).offset(offset) as any;
      }

      const records = await query;

      if (records.length === 0) {
        return res.json([]);
      }

      // OPTIMIZATION: Fetch PDF status for all records in ONE query instead of N queries (fixes N+1 problem)
      const recordIds = records.map(r => r.id);
      const pdfFiles = await db
        .select({
          hansardRecordId: hansardPdfFiles.hansardRecordId,
          id: hansardPdfFiles.id,
        })
        .from(hansardPdfFiles)
        .where(and(
          inArray(hansardPdfFiles.hansardRecordId, recordIds),
          eq(hansardPdfFiles.isPrimary, true)
        ));

      // Create a Set for O(1) lookup
      const recordsWithPdfs = new Set(pdfFiles.map(pdf => pdf.hansardRecordId));

      // Combine records with PDF status
      const recordsWithPdfStatus = records.map((record) => ({
        ...fixHansardPdfUrls(record as any, req),
        hasPdf: recordsWithPdfs.has(record.id)
      }));

      res.json(recordsWithPdfStatus);
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
      
      // Check if PDF exists
      const { eq, and } = await import("drizzle-orm");
      const [pdfFile] = await db.select({ id: hansardPdfFiles.id })
        .from(hansardPdfFiles)
        .where(and(
          eq(hansardPdfFiles.hansardRecordId, id),
          eq(hansardPdfFiles.isPrimary, true)
        ))
        .limit(1);
      
      // Fix localhost URLs in PDF links and add hasPdf flag
      const fixedRecord = {
        ...fixHansardPdfUrls(record, req),
        hasPdf: !!pdfFile
      };
      
      res.json(fixedRecord);
    } catch (error) {
      console.error("Error fetching Hansard record:", error);
      res.status(500).json({ error: "Failed to fetch Hansard record" });
    }
  });

  // Delete a Hansard record
  app.delete("/api/hansard-records/:id", requireAdmin, mutationRateLimit, auditMiddleware('hansard-record'), async (req, res) => {
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
  app.post("/api/hansard-records/upload", requireAdmin, uploadRateLimit, auditMiddleware('hansard-upload'), upload.array('pdfs', 25), handleMulterError, async (req: Request, res: Response) => {
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

          // Prepare Hansard record data (truncate transcript to match background job behavior)
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

          // CRITICAL FIX: Wrap all database operations in a transaction
          // This ensures that if ANY operation fails, the entire upload is rolled back
          // preventing orphaned hansard records without PDFs
          const record = await db.transaction(async (tx) => {
            // Create Hansard record with normalized parliament term
            const normalizedHansardData = {
              ...hansardData,
              parliamentTerm: normalizeParliamentTerm(hansardData.parliamentTerm)
            };
            const [insertedRecord] = await tx.insert(hansardRecords).values(normalizedHansardData).returning();

            // Save unmatched speakers for diagnostics and manual mapping
            if (parsed.unmatchedSpeakersDetailed && parsed.unmatchedSpeakersDetailed.length > 0) {
              console.log(`💾 Saving ${parsed.unmatchedSpeakersDetailed.length} unmatched speakers for diagnostic purposes`);

              for (const unmatched of parsed.unmatchedSpeakersDetailed) {
                await tx.insert(unmatchedSpeakers).values({
                  hansardRecordId: insertedRecord.id,
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
                  await tx.insert(parliamentaryQuestions).values({
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
                    hansardRecordId: insertedRecord.id,
                  });
                }
              }
            }

            // Save bills and motions
            if (parsed.bills && parsed.bills.length > 0) {
              console.log(`💾 Saving ${parsed.bills.length} bills`);
              for (const bill of parsed.bills) {
                if (bill.mpId) {
                  await tx.insert(legislativeProposals).values({
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
                    hansardRecordId: insertedRecord.id,
                  });
                }
              }
            }

            if (parsed.motions && parsed.motions.length > 0) {
              console.log(`💾 Saving ${parsed.motions.length} motions`);
              for (const motion of parsed.motions) {
                if (motion.mpId) {
                  await tx.insert(legislativeProposals).values({
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
                    hansardRecordId: insertedRecord.id,
                  });
                }
              }
            }

            // Store PDF in database (md5Hash already calculated earlier)
            // Check if a PDF with this hash already exists for this record
            const { eq, and } = await import("drizzle-orm");
            const [existingPdf] = await tx.select().from(hansardPdfFiles)
              .where(and(
                eq(hansardPdfFiles.hansardRecordId, insertedRecord.id),
                eq(hansardPdfFiles.md5Hash, md5Hash)
              ));

            if (existingPdf) {
              // Duplicate found - ensure it's marked as primary if not already
              if (!existingPdf.isPrimary) {
                await tx.update(hansardPdfFiles)
                  .set({ isPrimary: false })
                  .where(eq(hansardPdfFiles.hansardRecordId, insertedRecord.id));

                await tx.update(hansardPdfFiles)
                  .set({ isPrimary: true })
                  .where(eq(hansardPdfFiles.id, existingPdf.id));
              }
              console.log(`✓ PDF already exists (same MD5 hash), using existing file as primary`);
            } else {
              // New PDF - clear previous primary flags and insert
              await tx.update(hansardPdfFiles)
                .set({ isPrimary: false })
                .where(eq(hansardPdfFiles.hansardRecordId, insertedRecord.id));

              const [pdfFile] = await tx.insert(hansardPdfFiles).values({
                hansardRecordId: insertedRecord.id,
                originalFilename: file.originalname,
                fileSizeBytes: file.size,
                contentType: 'application/pdf',
                pdfData: file.buffer,
                md5Hash,
                uploadedBy: getCurrentUsername(req) || null,
                isPrimary: true,
              }).returning();

              console.log(`💾 Saved new PDF to database: ${pdfFile.id}`);
            }

            // Update MP speaking statistics using SQL increment to avoid race conditions
            const speakerIds = parsed.speakers.map(s => s.mpId);
            for (const mpId of speakerIds) {
              const speechCount = speechesPerMp.get(mpId) || 0;

              // Only increment if MP actually spoke (has speech instances)
              if (speechCount > 0) {
                await tx.update(mps)
                  .set({
                    hansardSessionsSpoke: sql`${mps.hansardSessionsSpoke} + 1`,
                    totalSpeechInstances: sql`${mps.totalSpeechInstances} + ${speechCount}`
                  })
                  .where(eq(mps.id, mpId));
              }
            }

            return insertedRecord;
          });

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

  // Get list of MPs who spoke in a specific Hansard session
  app.get("/api/hansard-records/:id/speakers", async (req, res) => {
    try {
      const hansardRecordId = req.params.id;

      // Check cache first
      const cached = hansardSpeakersCache.get(hansardRecordId);
      if (cached) {
        console.log(`💾 Cache hit for Hansard speakers: ${hansardRecordId}`);
        return res.json(cached);
      }

      // Fetch the Hansard record from database
      const hansardRecord = await storage.getHansardRecord(hansardRecordId);
      if (!hansardRecord) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // PRIORITY 1: Check for pre-computed speaker data in database (instant!)
      if (hansardRecord.speakerStats && Array.isArray(hansardRecord.speakerStats) && hansardRecord.speakerStats.length > 0) {
        console.log(`⚡ Using pre-computed speaker data for ${hansardRecord.sessionNumber} (${hansardRecord.speakerStats.length} speakers)`);
        
        // Build a map of speaker stats for enrichment
        const speakerStatsMap = new Map<string, { totalSpeeches: number; speakingOrder: number }>();
        for (const stat of hansardRecord.speakerStats as any[]) {
          speakerStatsMap.set(stat.mpId, {
            totalSpeeches: stat.totalSpeeches || 1,
            speakingOrder: stat.speakingOrder || 0,
          });
        }
        
        // Get MP details for the pre-computed speaker IDs
        const speakerMpIds = new Set(hansardRecord.speakerStats.map((s: any) => s.mpId));
        const allMps = await db.select().from(mps);
        
        const speakerMps = allMps
          .filter(mp => speakerMpIds.has(mp.id))
          .map(mp => {
            const stats = speakerStatsMap.get(mp.id);
            return {
              id: mp.id,
              name: mp.name,
              constituency: mp.constituency,
              party: mp.party,
              photoUrl: mp.photoUrl,
              totalSpeeches: stats?.totalSpeeches || 1,
              speakingOrder: stats?.speakingOrder || 0,
            };
          })
          .sort((a, b) => a.constituency.localeCompare(b.constituency));

        const result = {
          hansardRecordId,
          sessionNumber: hansardRecord.sessionNumber,
          speakers: speakerMps,
          preComputed: true,
        };

        // Cache for future requests
        hansardSpeakersCache.set(hansardRecordId, result);
        return res.json(result);
      }

      // PRIORITY 2: Check for speakers array in database
      if (hansardRecord.speakers && Array.isArray(hansardRecord.speakers) && hansardRecord.speakers.length > 0) {
        console.log(`⚡ Using speakers array for ${hansardRecord.sessionNumber} (${hansardRecord.speakers.length} speakers)`);
        
        // Build a map of speaker data for enrichment
        const speakersMap = new Map<string, { totalSpeeches?: number; speakingOrder?: number }>();
        for (const speaker of hansardRecord.speakers as any[]) {
          speakersMap.set(speaker.mpId, {
            totalSpeeches: speaker.totalSpeeches || 1,
            speakingOrder: speaker.speakingOrder || 0,
          });
        }
        
        const speakerMpIds = new Set(hansardRecord.speakers.map((s: any) => s.mpId));
        const allMps = await db.select().from(mps);
        
        const speakerMps = allMps
          .filter(mp => speakerMpIds.has(mp.id))
          .map(mp => {
            const data = speakersMap.get(mp.id);
            return {
              id: mp.id,
              name: mp.name,
              constituency: mp.constituency,
              party: mp.party,
              photoUrl: mp.photoUrl,
              totalSpeeches: data?.totalSpeeches || 1,
              speakingOrder: data?.speakingOrder || 0,
            };
          })
          .sort((a, b) => a.constituency.localeCompare(b.constituency));

        const result = {
          hansardRecordId,
          sessionNumber: hansardRecord.sessionNumber,
          speakers: speakerMps,
          preComputed: true,
        };

        hansardSpeakersCache.set(hansardRecordId, result);
        return res.json(result);
      }

      // FALLBACK: Parse PDF on-demand (for records without pre-computed data)
      console.log(`🔍 No pre-computed data for ${hansardRecord.sessionNumber} - parsing PDF...`);

      // Get all MPs from database
      const allMps = await db.select().from(mps);

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

      // Extract unique MP IDs who spoke
      const speakerMpIds = new Set(parsed.speakers.map(s => s.mpId));

      // Get full MP details for speakers
      const speakerMps = allMps
        .filter(mp => speakerMpIds.has(mp.id))
        .map(mp => ({
          id: mp.id,
          name: mp.name,
          constituency: mp.constituency,
          party: mp.party,
          photoUrl: mp.photoUrl,
        }))
        .sort((a, b) => a.constituency.localeCompare(b.constituency));

      console.log(`✅ Found ${speakerMps.length} MPs who spoke in session ${hansardRecord.sessionNumber}`);

      const result = {
        hansardRecordId,
        sessionNumber: hansardRecord.sessionNumber,
        speakers: speakerMps,
        preComputed: false,
      };

      // Cache the result to avoid re-parsing
      hansardSpeakersCache.set(hansardRecordId, result);

      // Clear pdfBuffer to free memory
      pdfBuffer = null as any;
      if (global.gc) {
        global.gc();
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching Hansard speakers:", error);
      res.status(500).json({
        error: "Failed to fetch speakers",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Analyze Hansard PDF for specific MP speeches (transient analysis, no persistence)
  app.post("/api/hansard-analysis", mutationRateLimit, auditMiddleware('hansard-analysis'), async (req, res) => {
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
  app.post("/api/hansard-speaker-stats", requireAdmin, uploadRateLimit, auditMiddleware('hansard-speaker-stats'), upload.single('pdf'), handleMulterError, async (req: Request, res: Response) => {
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
  app.post("/api/hansard-records", requireAdmin, mutationRateLimit, auditMiddleware('hansard-record'), async (req, res) => {
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
  app.patch("/api/hansard-records/:id", requireAdmin, mutationRateLimit, auditMiddleware('hansard-record'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateHansardRecordSchema.parse(req.body);
      const record = await storage.updateHansardRecord(id, validatedData);

      if (!record) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // If attendance was updated, recalculate MP attendance stats using the centralized aggregation function
      // This ensures consistent calculation across all 222 MPs based on sworn-in dates
      // Note: Only recalculate attendance (not speeches) for better performance
      if (validatedData.attendedMpIds !== undefined || validatedData.absentMpIds !== undefined) {
        try {
          console.log("🔄 Triggering MP attendance recalculation after update...");
          const { aggregateAttendanceForAllMps } = await import('./aggregate-speeches');
          const attendanceResult = await aggregateAttendanceForAllMps();
          console.log(`✅ Attendance recalculated: ${attendanceResult.totalMpsUpdated} MPs updated from ${attendanceResult.totalRecordsProcessed} records`);
        } catch (recalcError) {
          console.error("Error recalculating MP attendance:", recalcError);
          // Don't fail the request if recalculation fails
        }
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
  app.post("/api/hansard-records/bulk-delete", requireAdmin, mutationRateLimit, auditMiddleware('hansard-record'), async (req, res) => {
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
      
      const baseQuery = db.select()
        .from(unmatchedSpeakers)
        .orderBy(desc(unmatchedSpeakers.createdAt));
      
      const speakers = unmappedOnly === 'true'
        ? await baseQuery.where(eq(unmatchedSpeakers.isMapped, false))
        : await baseQuery;
      
      res.json(speakers);
    } catch (error) {
      console.error("Error fetching unmatched speakers:", error);
      res.status(500).json({ error: "Failed to fetch unmatched speakers" });
    }
  });

  // Create a manual speaker mapping
  app.post("/api/speaker-mappings", mutationRateLimit, auditMiddleware('speaker-mapping'), async (req, res) => {
    try {
      const validatedData = insertSpeakerMappingSchema.parse(req.body);
      
      // Create the mapping
      const [mapping] = await db.insert(speakerMappings)
        .values({
          ...validatedData,
          confidence: validatedData.confidence || 1.0,
          notes: validatedData.notes || null,
          createdBy: validatedData.createdBy || null,
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
  app.post("/api/hansard-records/:id/summarize", requireAdmin, mutationRateLimit, auditMiddleware('hansard-summary'), async (req, res) => {
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
      const attendedMpIds = new Set(record.attendedMpIds || []);
      const hasExplicitAttendance = attendedMpIds.size > 0;
      
      // Use explicit attendedMpIds if available (new system)
      // Otherwise fall back to "not absent = attended" (old system)
      const attendedMps = allMps.filter(mp => {
        if (hasExplicitAttendance) {
          return attendedMpIds.has(mp.id);
        }
        return !absentMpIds.has(mp.id);
      });
      const absentMps = allMps.filter(mp => {
        if (hasExplicitAttendance) {
          return !attendedMpIds.has(mp.id);
        }
        return absentMpIds.has(mp.id);
      });
      
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
        // Use same logic as above for consistency
        if (hasExplicitAttendance) {
          if (attendedMpIds.has(mp.id)) {
            acc[mp.state].attended++;
          } else {
            acc[mp.state].absent++;
          }
        } else {
          if (absentMpIds.has(mp.id)) {
            acc[mp.state].absent++;
          } else {
            acc[mp.state].attended++;
          }
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
        stateStats,
        senatorsAttending: record.senatorsAttending || []
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
          const attendedMpIds = new Set(record.attendedMpIds || []);
          const hasExplicitAttendance = attendedMpIds.size > 0;
          
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
            // Use explicit attendedMpIds if available (new system)
            // Otherwise fall back to "not absent = attended" (old system)
            if (hasExplicitAttendance) {
              if (attendedMpIds.has(activeMp.id)) {
                sessionsAttended++;
              } else {
                sessionsAbsent++;
              }
            } else {
              // Fallback to old system
              if (absentMpIds.has(activeMp.id)) {
                sessionsAbsent++;
              } else {
                sessionsAttended++;
              }
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
        const attendedMpIds = record.attendedMpIds || [];
        const hasExplicitAttendance = attendedMpIds.length > 0;
        const mpIdMap = new Map(allMps.map(mp => [mp.id, mp]));
        
        // Use explicit attendedMpIds if available (new system)
        // Otherwise fall back to "not absent = attended" (old system)
        const absentMps = hasExplicitAttendance
          ? filteredMps.filter(mp => !attendedMpIds.includes(mp.id))
          : absentMpIds
              .map(id => mpIdMap.get(id))
              .filter((mp): mp is NonNullable<typeof mp> => mp !== undefined)
              .filter(mp => filteredMps.some(fmp => fmp.id === mp.id));
        
        const attendedMps = hasExplicitAttendance
          ? filteredMps.filter(mp => attendedMpIds.includes(mp.id))
          : filteredMps.filter(mp => !absentMpIds.includes(mp.id));
        
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
  app.delete("/api/hansard-records", requireAdmin, mutationRateLimit, auditMiddleware('hansard-record'), async (_req, res) => {
    try {
      const count = await storage.deleteAllHansardRecords();
      res.json({ deletedCount: count });
    } catch (error) {
      console.error("Error deleting all Hansard records:", error);
      res.status(500).json({ error: "Failed to delete all Hansard records" });
    }
  });

  // Clean up orphaned Hansard records (records without PDFs)
  app.post("/api/hansard-records/cleanup-orphaned", requireAdmin, mutationRateLimit, auditMiddleware('hansard-cleanup'), async (_req, res) => {
    try {
      console.log("🧹 Starting cleanup of orphaned Hansard records (records without PDFs)...");

      // Find all hansard records
      const allRecords = await db.select({ id: hansardRecords.id, sessionNumber: hansardRecords.sessionNumber })
        .from(hansardRecords);

      console.log(`📊 Found ${allRecords.length} total Hansard records`);

      // Check each record for associated PDF
      const orphanedRecords = [];
      for (const record of allRecords) {
        const [pdfFile] = await db.select({ id: hansardPdfFiles.id })
          .from(hansardPdfFiles)
          .where(eq(hansardPdfFiles.hansardRecordId, record.id))
          .limit(1);

        if (!pdfFile) {
          orphanedRecords.push(record);
        }
      }

      console.log(`🗑️  Found ${orphanedRecords.length} orphaned records without PDFs`);

      if (orphanedRecords.length === 0) {
        return res.json({
          message: "No orphaned records found",
          deletedCount: 0,
          orphanedRecords: []
        });
      }

      // Delete orphaned records (cascade will handle related data)
      let deletedCount = 0;
      const deletedRecords = [];

      for (const record of orphanedRecords) {
        const deleted = await storage.deleteHansardRecord(record.id);
        if (deleted) {
          deletedCount++;
          deletedRecords.push(record.sessionNumber);
          console.log(`✓ Deleted orphaned record: ${record.sessionNumber}`);
        }
      }

      console.log(`✅ Cleanup complete: deleted ${deletedCount} orphaned records`);

      res.json({
        message: `Successfully deleted ${deletedCount} orphaned Hansard records`,
        deletedCount,
        orphanedRecords: deletedRecords
      });
    } catch (error) {
      console.error("Error cleaning up orphaned Hansard records:", error);
      res.status(500).json({
        error: "Failed to clean up orphaned Hansard records",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reprocess attendance for all or selected Hansard records
  app.post("/api/hansard-records/reprocess-attendance", requireAdmin, mutationRateLimit, auditMiddleware('hansard-reprocess'), async (req, res) => {
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
  app.post("/api/hansard-records/download", requireAdmin, mutationRateLimit, auditMiddleware('hansard-download'), async (req, res) => {
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

  // Constituency endpoints
  app.get("/api/constituencies", async (_req, res) => {
    try {
      const constituencies = await storage.getAllConstituencies();
      // Convert poverty incidence from integer tenths back to decimal
      const constituenciesWithPoverty = constituencies.map(c => ({
        ...c,
        povertyIncidence: c.povertyIncidence ? c.povertyIncidence / 10 : null,
      }));
      res.json(constituenciesWithPoverty);
    } catch (error) {
      console.error("Error fetching constituencies:", error);
      res.status(500).json({ error: "Failed to fetch constituencies" });
    }
  });

  app.get("/api/constituencies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const constituency = await storage.getConstituency(id);

      if (!constituency) {
        return res.status(404).json({ error: "Constituency not found" });
      }

      // Convert poverty incidence from integer tenths back to decimal
      res.json({
        ...constituency,
        povertyIncidence: constituency.povertyIncidence ? constituency.povertyIncidence / 10 : null,
      });
    } catch (error) {
      console.error("Error fetching constituency:", error);
      res.status(500).json({ error: "Failed to fetch constituency" });
    }
  });

  app.get("/api/constituencies/code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const constituency = await storage.getConstituencyByCode(code);

      if (!constituency) {
        return res.status(404).json({ error: "Constituency not found" });
      }

      // Convert poverty incidence from integer tenths back to decimal
      res.json({
        ...constituency,
        povertyIncidence: constituency.povertyIncidence ? constituency.povertyIncidence / 10 : null,
      });
    } catch (error) {
      console.error("Error fetching constituency:", error);
      res.status(500).json({ error: "Failed to fetch constituency" });
    }
  });

  // Summarize text with Hugging Face mT5 (supports Malay and English)
  app.post("/api/summarize", mutationRateLimit, auditMiddleware('summarize'), async (req, res) => {
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

  // AI Analysis endpoints using DeepSeek (fallback to Gemini if not configured)
  app.post("/api/analyze/topics/:hansardId", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Check if analysis already exists
      const existing = await storage.getTopicAnalysis(hansardId);
      if (existing) {
        return res.json(existing);
      }

      // Extract topics using DeepSeek (or Gemini as fallback)
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const useDeepSeek = deepseek.isDeepSeekConfigured();
      const extractTopics = useDeepSeek
        ? deepseek.extractTopics
        : gemini.extractTopics;

      const aiProvider = useDeepSeek ? "DeepSeek" : "Gemini";
      console.log(`[AI Topics] Using ${aiProvider} for ${hansardId}`);

      if (!useDeepSeek && !process.env.GEMINI_API_KEY) {
        throw new Error("No AI provider configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY in .env file");
      }

      const speakerNames = hansard.speakers?.map(s => s.mpName) || [];
      const topics = await extractTopics(hansard.transcript, speakerNames);

      // Store in database
      const analysis = await storage.saveTopicAnalysis({
        hansardRecordId: hansardId,
        topics,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in topic extraction:", error);
      res.status(500).json({ error: "Failed to extract topics", details: String(error) });
    }
  });

  app.post("/api/analyze/sentiment/:hansardId", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Check if analysis already exists
      const existing = await storage.getSentimentAnalysis(hansardId);
      if (existing) {
        return res.json(existing);
      }

      // Analyze sentiment using DeepSeek (or Gemini as fallback)
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const useDeepSeek = deepseek.isDeepSeekConfigured();
      const analyzeSentiment = useDeepSeek
        ? deepseek.analyzeSentiment
        : gemini.analyzeSentiment;

      const aiProvider = useDeepSeek ? "DeepSeek" : "Gemini";
      console.log(`[AI Sentiment] Using ${aiProvider} for ${hansardId}`);

      if (!useDeepSeek && !process.env.GEMINI_API_KEY) {
        throw new Error("No AI provider configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY in .env file");
      }

      const result = await analyzeSentiment(hansard.transcript);

      // Store in database
      const analysis = await storage.saveSentimentAnalysis({
        hansardRecordId: hansardId,
        overallSentiment: result.overallSentiment,
        sentimentScore: result.sentimentScore,
        confidence: result.confidence,
        keyPoints: result.keyPoints,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in sentiment analysis:", error);
      res.status(500).json({ error: "Failed to analyze sentiment", details: String(error) });
    }
  });

  app.post("/api/analyze/speakers/:hansardId", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const { force = false } = req.body || {};
      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Check if analysis already exists (unless force re-analysis)
      if (!force) {
        const existing = await storage.getSpeakerAnalysis(hansardId);
        if (existing) {
          return res.json(existing);
        }
      } else {
        // Delete existing analysis if force is true
        await storage.deleteSpeakerAnalysis(hansardId);
        console.log(`[AI Speakers] Force re-analysis requested for ${hansardId}, deleted existing data`);
      }

      // Analyze speakers using DeepSeek (or Gemini as fallback)
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const useDeepSeek = deepseek.isDeepSeekConfigured();
      const analyzeSpeakers = useDeepSeek
        ? deepseek.analyzeSpeakers
        : gemini.analyzeSpeakers;

      const aiProvider = useDeepSeek ? "DeepSeek" : "Gemini";
      console.log(`[AI Speakers] Using ${aiProvider} for ${hansardId}`);

      if (!useDeepSeek && !process.env.GEMINI_API_KEY) {
        throw new Error("No AI provider configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY in .env file");
      }

      const speakers = hansard.speakers?.map(s => ({
        mpId: s.mpId,
        mpName: s.mpName,
      })) || [];

      const insights = await analyzeSpeakers(hansard.transcript, speakers);

      // Store in database
      const analysis = await storage.saveSpeakerAnalysis({
        hansardRecordId: hansardId,
        speakerInsights: insights,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in speaker analysis:", error);
      res.status(500).json({ error: "Failed to analyze speakers", details: String(error) });
    }
  });

  app.post("/api/analyze/detailed-summary/:hansardId", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const { language = "en" } = req.body;

      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Check if analysis already exists for this language
      const existing = await storage.getDetailedSummary(hansardId, language);
      if (existing) {
        return res.json(existing);
      }

      // Generate detailed summary using DeepSeek (or Gemini as fallback)
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const useDeepSeek = deepseek.isDeepSeekConfigured();
      const generateDetailedSummary = useDeepSeek
        ? deepseek.generateDetailedSummary
        : gemini.generateDetailedSummary;

      const aiProvider = useDeepSeek ? "DeepSeek" : "Gemini";
      console.log(`[AI Summary] Using ${aiProvider} for ${hansardId} (${language})`);

      if (!useDeepSeek && !process.env.GEMINI_API_KEY) {
        throw new Error("No AI provider configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY in .env file");
      }

      const result = await generateDetailedSummary(hansard.transcript, language as "en" | "ms");

      // Store in database
      const analysis = await storage.saveDetailedSummary({
        hansardRecordId: hansardId,
        language,
        keyArguments: result.keyArguments,
        decisions: result.decisions,
        actionItems: result.actionItems,
        controversialPoints: result.controversialPoints,
        summary: result.summary,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error in detailed summary:", error);
      res.status(500).json({ error: "Failed to generate detailed summary", details: String(error) });
    }
  });

  app.post("/api/hansard/:hansardId/qa", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Check cache first
      const cached = await storage.getQaCache(hansardId, question);
      if (cached) {
        return res.json(cached);
      }

      // Answer question using DeepSeek (or Gemini as fallback)
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const useDeepSeek = deepseek.isDeepSeekConfigured();
      const answerQuestion = useDeepSeek
        ? deepseek.answerQuestion
        : gemini.answerQuestion;

      const aiProvider = useDeepSeek ? "DeepSeek" : "Gemini";
      console.log(`[AI Q&A] Using ${aiProvider} for ${hansardId}`);

      if (!useDeepSeek && !process.env.GEMINI_API_KEY) {
        throw new Error("No AI provider configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY in .env file");
      }

      const result = await answerQuestion(question, hansard.transcript);

      // Cache the result
      const qaResult = await storage.saveQaCache({
        hansardRecordId: hansardId,
        question,
        answer: result.answer,
        context: hansard.transcript.substring(0, 1000),
        relevanceScore: result.relevanceScore,
      });

      res.json(qaResult);
    } catch (error) {
      console.error("Error in Q&A:", error);
      res.status(500).json({ error: "Failed to answer question", details: String(error) });
    }
  });

  // Get topic-specific summary with caching
  app.post("/api/hansard/:hansardId/topic-summary", mutationRateLimit, async (req, res) => {
    try {
      const { hansardId } = req.params;
      const { topicName } = req.body;

      if (!topicName) {
        return res.status(400).json({ error: "Topic name is required" });
      }

      // Check cache first
      const cached = await storage.getTopicSummaryCache(hansardId, topicName);
      if (cached) {
        console.log(`[AI Topic Summary] Cache hit for topic: ${topicName}`, JSON.stringify({
          summaryLength: cached.summary?.length || 0,
          keyPointsCount: cached.keyPoints?.length || 0,
          speakersCount: cached.speakers?.length || 0,
          quotesCount: cached.quotes?.length || 0,
        }));

        const response = {
          summary: cached.summary,
          keyPoints: cached.keyPoints,
          speakers: cached.speakers,
          quotes: cached.quotes,
          cached: true,
        };

        // Debug: Log the actual response being sent
        console.log(`[AI Topic Summary] Sending cached response:`, JSON.stringify({
          summaryPreview: response.summary?.substring(0, 50),
          keyPoints: response.keyPoints,
          speakers: response.speakers,
          quotes: response.quotes,
        }));

        return res.json(response);
      }

      const hansard = await storage.getHansardById(hansardId);

      if (!hansard) {
        return res.status(404).json({ error: "Hansard record not found" });
      }

      // Generate topic summary using AI service (Gemini preferred, OpenRouter fallback)
      const deepseek = await import("./services/deepseek.js");

      if (!deepseek.isDeepSeekConfigured()) {
        throw new Error("No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in .env file");
      }

      console.log(`[AI Topic Summary] Cache miss, generating summary for topic: ${topicName}`);

      const result = await deepseek.generateTopicSummary(topicName, hansard.transcript);

      // Log the AI result for debugging
      console.log(`[AI Topic Summary] Generated result:`, JSON.stringify({
        summary: result.summary?.substring(0, 100) + '...',
        keyPointsCount: result.keyPoints?.length || 0,
        speakersCount: result.speakers?.length || 0,
        quotesCount: result.quotes?.length || 0,
      }));

      // Save to cache
      await storage.saveTopicSummaryCache({
        hansardRecordId: hansardId,
        topicName,
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        speakers: result.speakers || [],
        quotes: result.quotes || [],
      });

      res.json({ ...result, cached: false });
    } catch (error) {
      console.error("Error in topic summary:", error);
      res.status(500).json({ error: "Failed to generate topic summary", details: String(error) });
    }
  });

  // Get all analysis for a Hansard record
  app.get("/api/analyze/:hansardId", async (req, res) => {
    try {
      const { hansardId } = req.params;
      
      const [topics, sentiment, speakers, summaryEn, summaryMs] = await Promise.all([
        storage.getTopicAnalysis(hansardId).catch(() => null),
        storage.getSentimentAnalysis(hansardId).catch(() => null),
        storage.getSpeakerAnalysis(hansardId).catch(() => null),
        storage.getDetailedSummary(hansardId, "en").catch(() => null),
        storage.getDetailedSummary(hansardId, "ms").catch(() => null),
      ]);

      res.json({
        topics,
        sentiment,
        speakers,
        detailedSummary: {
          en: summaryEn,
          ms: summaryMs,
        },
      });
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Admin endpoint to manually trigger database seeding (for Railway/production)
  app.post("/api/admin/seed", requireAdmin, async (req, res) => {
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
  app.get("/api/admin/db-status", requireAdmin, async (req, res) => {
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
  app.post("/api/admin/trigger-hansard-check", requireAdmin, async (req, res) => {
    try {
      console.log("Manual Hansard sync triggered via API...");
      const { addSyncLog } = await import('./hansard-cron');
      const result = await runHansardSync({ triggeredBy: 'manual' });

      // Log the result
      addSyncLog(result);

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
    } catch (error: any) {
      console.error("Error triggering Hansard sync:", error);
      // Log failed sync attempt
      const { addSyncLog } = await import('./hansard-cron');
      addSyncLog({
        triggeredBy: 'manual',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 0,
        lastKnownSession: null,
        recordsFound: 0,
        recordsInserted: 0,
        recordsSkipped: 0,
        errors: [{ sessionNumber: 'N/A', error: error.message || String(error) }]
      });
      res.status(500).json({ error: "Failed to trigger Hansard sync", details: String(error) });
    }
  });

  // Admin endpoint to get Hansard sync logs
  app.get("/api/admin/hansard-sync-logs", requireAdmin, async (req, res) => {
    try {
      const { getSyncLogs, getLatestSyncLog } = await import('./hansard-cron');
      const logs = getSyncLogs();
      const latest = getLatestSyncLog();

      res.json({
        totalLogs: logs.length,
        latestSync: latest,
        logs: logs
      });
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // Admin endpoint to refresh all MP data (attendance, speeches, Hansard performance)
  app.post("/api/admin/refresh-mp-data", requireAdmin, async (req, res) => {
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
  app.post("/api/admin/reextract-activities", requireAdmin, async (req, res) => {
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
  app.get("/api/admin/hansard-diagnostics", requireAdmin, async (req, res) => {
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

  // Get detailed summary status for all Hansard records
  app.get("/api/admin/hansard-summary-status", requireAdmin, async (req, res) => {
    try {
      const status = await storage.getHansardSummaryStatus();
      const missingEnglish = await storage.getHansardRecordsMissingSummaries("en");
      const missingMalay = await storage.getHansardRecordsMissingSummaries("ms");
      
      res.json({
        ...status,
        missingEnglishCount: missingEnglish.length,
        missingMalayCount: missingMalay.length,
        missingEnglish: missingEnglish.slice(0, 20), // First 20
        missingMalay: missingMalay.slice(0, 20), // First 20
      });
    } catch (error) {
      console.error("Error getting Hansard summary status:", error);
      res.status(500).json({ error: "Failed to get summary status", details: String(error) });
    }
  });

  // Bulk generate detailed summaries for all Hansard records missing them
  app.post("/api/admin/generate-all-summaries", requireAdmin, mutationRateLimit, auditMiddleware('hansard-bulk-summary'), async (req, res) => {
    try {
      const { language = "en", limit = 5 } = req.body;
      
      console.log(`🔄 Starting bulk summary generation for language: ${language}`);
      
      const missingSummaries = await storage.getHansardRecordsMissingSummaries(language);
      
      if (missingSummaries.length === 0) {
        return res.json({
          message: `All Hansard records already have ${language === "en" ? "English" : "Malay"} summaries`,
          processed: 0,
          remaining: 0,
        });
      }
      
      const toProcess = missingSummaries.slice(0, limit);
      console.log(`📊 Processing ${toProcess.length} of ${missingSummaries.length} records`);

      // Use DeepSeek if configured, otherwise fallback to Gemini
      const deepseek = await import("./services/deepseek.js");
      const gemini = await import("./services/gemini.js");

      const generateDetailedSummary = deepseek.isDeepSeekConfigured()
        ? deepseek.generateDetailedSummary
        : gemini.generateDetailedSummary;

      const aiProvider = deepseek.isDeepSeekConfigured() ? "DeepSeek" : "Gemini";
      console.log(`🤖 Using ${aiProvider} for summary generation`);

      let successCount = 0;
      let errorCount = 0;
      const results: Array<{ id: string; sessionNumber: string; success: boolean; error?: string }> = [];
      
      for (const record of toProcess) {
        try {
          const hansard = await storage.getHansardById(record.id);
          if (!hansard || !hansard.transcript) {
            results.push({ id: record.id, sessionNumber: record.sessionNumber, success: false, error: "No transcript" });
            errorCount++;
            continue;
          }
          
          // Generate detailed summary
          const summaryResult = await generateDetailedSummary(hansard.transcript, language as "en" | "ms");
          
          // Save to database
          await storage.saveDetailedSummary({
            hansardRecordId: record.id,
            language,
            keyArguments: summaryResult.keyArguments,
            decisions: summaryResult.decisions,
            actionItems: summaryResult.actionItems,
            controversialPoints: summaryResult.controversialPoints,
            summary: summaryResult.summary,
          });
          
          results.push({ id: record.id, sessionNumber: record.sessionNumber, success: true });
          successCount++;
          console.log(`✅ Generated summary for ${record.sessionNumber}`);
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          results.push({ id: record.id, sessionNumber: record.sessionNumber, success: false, error: String(error) });
          errorCount++;
          console.error(`❌ Error processing ${record.sessionNumber}:`, error);
        }
      }
      
      res.json({
        message: `Processed ${successCount + errorCount} records`,
        language,
        successCount,
        errorCount,
        remaining: missingSummaries.length - toProcess.length,
        results,
      });
    } catch (error) {
      console.error("Error in bulk summary generation:", error);
      res.status(500).json({ error: "Failed to generate summaries", details: String(error) });
    }
  });

  // Endpoint to reprocess Hansard records without speaker stats
  app.post("/api/admin/reprocess-hansard-speakers", requireAdmin, async (req, res) => {
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
          const { refreshAllMpData } = await import('./aggregate-speeches');
          const refreshResult = await refreshAllMpData();
          console.log(`✅ MP data refreshed: ${refreshResult.attendance.totalMpsUpdated} MPs updated`);
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

  // Endpoint to rescan attendance data from ALL hansard records with PDFs
  app.post("/api/admin/rescan-all-attendance", requireAdmin, async (req, res) => {
    try {
      console.log("🔄 Rescanning attendance data from ALL Hansard PDFs...");
      
      // Get all Hansard records
      const allRecords = await db.select().from(hansardRecords);
      
      if (allRecords.length === 0) {
        return res.json({
          message: "No hansard records found",
          processed: 0,
          total: 0
        });
      }

      console.log(`📊 Found ${allRecords.length} total records to rescan`);

      // Get all MPs
      const allMps = await db.select().from(mps);
      const parser = new HansardPdfParser(allMps);
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const updatedRecords: { sessionNumber: string; attendedCount: number; absentCount: number }[] = [];

      for (const record of allRecords) {
        try {
          // Get the PDF file for this Hansard
          const pdfFile = await db.select().from(hansardPdfFiles)
            .where(eq(hansardPdfFiles.hansardRecordId, record.id))
            .limit(1);

          if (pdfFile.length === 0 || !pdfFile[0].pdfData) {
            console.log(`⏭️  Skipping ${record.sessionNumber} - No PDF file available`);
            skippedCount++;
            continue;
          }

          console.log(`📄 Rescanning attendance for ${record.sessionNumber}...`);
          
          // Re-parse the PDF to extract attendance data
          const parsed = await parser.parseHansardPdf(pdfFile[0].pdfData, pdfFile[0].originalFilename);

          // Update the record with new attendance data
          await db.update(hansardRecords)
            .set({
              attendedMpIds: parsed.attendance.attendedMpIds,
              absentMpIds: parsed.attendance.absentMpIds,
              constituenciesPresent: parsed.speakerStats.constituenciesAttended,
              constituenciesAbsent: parsed.attendance.absentConstituencies.length,
            })
            .where(eq(hansardRecords.id, record.id));

          console.log(`✅ Updated ${record.sessionNumber} - ${parsed.attendance.attendedMpIds.length} attended, ${parsed.attendance.absentMpIds.length} absent`);
          
          updatedRecords.push({
            sessionNumber: record.sessionNumber,
            attendedCount: parsed.attendance.attendedMpIds.length,
            absentCount: parsed.attendance.absentMpIds.length
          });
          
          successCount++;
        } catch (error) {
          console.error(`❌ Error rescanning ${record.sessionNumber}:`, error);
          errors.push(`${record.sessionNumber}: ${String(error)}`);
          errorCount++;
        }
      }

      console.log(`✅ Attendance rescan complete: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

      // If we successfully reprocessed any records, trigger MP data refresh
      if (successCount > 0) {
        // Invalidate the MP attendance cache so subsequent API calls get fresh data
        mpAttendanceCache = null;
        mpAttendanceCacheTime = 0;
        console.log("🗑️  Cleared MP attendance cache");
        
        try {
          console.log("🔄 Triggering MP data refresh after attendance rescan...");
          const { refreshAllMpData } = await import('./aggregate-speeches');
          const refreshResult = await refreshAllMpData();
          console.log(`✅ MP data refreshed: ${refreshResult.attendance.totalMpsUpdated} MPs updated`);
        } catch (refreshError) {
          console.error("⚠️  Failed to auto-refresh MP data after rescan:", refreshError);
        }
      }

      res.json({
        message: successCount > 0 ? "Attendance rescan complete - MP data refreshed" : "Attendance rescan complete",
        total: allRecords.length,
        successCount,
        errorCount,
        skippedCount,
        updatedRecords: updatedRecords.slice(0, 10), // Return first 10 for summary
        errors: errorCount > 0 ? errors.slice(0, 20) : undefined
      });
    } catch (error) {
      console.error("Error rescanning attendance:", error);
      res.status(500).json({ error: "Failed to rescan attendance", details: String(error) });
    }
  });

  // Constituency Attendance Audit - Get detailed attendance for a specific constituency
  app.get("/api/admin/constituency-attendance-audit", requireAdmin, async (req, res) => {
    try {
      const { constituency } = req.query;
      
      if (!constituency || typeof constituency !== 'string') {
        return res.status(400).json({ error: "Constituency parameter is required" });
      }

      console.log(`📊 Auditing attendance for constituency: ${constituency}`);

      // Find the MP for this constituency
      const mpResult = await db.select().from(mps).where(eq(mps.constituency, constituency)).limit(1);
      
      if (mpResult.length === 0) {
        return res.status(404).json({ error: `No MP found for constituency: ${constituency}` });
      }

      const mp = mpResult[0];
      console.log(`👤 Found MP: ${mp.name} (ID: ${mp.id})`);

      // Get all Hansard records
      const allRecords = await db.select({
        id: hansardRecords.id,
        sessionNumber: hansardRecords.sessionNumber,
        sessionDate: hansardRecords.sessionDate,
        attendedMpIds: hansardRecords.attendedMpIds,
        absentMpIds: hansardRecords.absentMpIds,
      }).from(hansardRecords).orderBy(sql`session_date DESC`);

      const attendedSessions: Array<{ sessionNumber: string; sessionDate: string }> = [];
      const absentSessions: Array<{ sessionNumber: string; sessionDate: string }> = [];
      
      // Get MP sworn-in date for filtering
      const mpSwornInDate = new Date(mp.swornInDate);
      
      // Count ALL Hansard records after MP was sworn in as total sessions
      // Each Hansard record represents one parliament sitting day
      let totalSessions = 0;

      for (const record of allRecords) {
        const sessionDate = record.sessionDate ? new Date(record.sessionDate) : null;
        
        // Only count sessions after MP was sworn in
        if (!sessionDate || sessionDate < mpSwornInDate) {
          continue;
        }
        
        // Every Hansard record after sworn-in counts as a session
        totalSessions++;
        
        const attendedMpIds = (record.attendedMpIds || []) as string[];
        const absentMpIds = (record.absentMpIds || []) as string[];
        
        const sessionInfo = {
          sessionNumber: record.sessionNumber,
          sessionDate: sessionDate.toISOString().split('T')[0]
        };

        if (attendedMpIds.includes(mp.id)) {
          // MP explicitly marked as attended
          attendedSessions.push(sessionInfo);
        } else if (absentMpIds.includes(mp.id)) {
          // MP explicitly marked as absent
          absentSessions.push(sessionInfo);
        } else if (attendedMpIds.length > 0) {
          // If attendance was recorded but MP is not in either list, count as absent
          // (they should have been recorded if present)
          absentSessions.push(sessionInfo);
        } else {
          // No attendance data for this session - give benefit of doubt, count as attended
          attendedSessions.push(sessionInfo);
        }
      }

      const daysAttended = attendedSessions.length;
      const daysAbsent = absentSessions.length;
      const attendanceRate = totalSessions > 0 ? ((daysAttended / totalSessions) * 100).toFixed(1) : '0';

      console.log(`✅ Audit complete: ${daysAttended} attended, ${daysAbsent} absent, ${totalSessions} total sessions`);

      res.json({
        mp: {
          id: mp.id,
          name: mp.name,
          constituency: mp.constituency,
          state: mp.state,
          party: mp.party,
        },
        summary: {
          daysAttended,
          daysAbsent,
          totalSessions,
          attendanceRate: `${attendanceRate}%`,
        },
        attendedSessions,
        absentSessions,
      });
    } catch (error) {
      console.error("Error auditing constituency attendance:", error);
      res.status(500).json({ error: "Failed to audit attendance", details: String(error) });
    }
  });

  // Track page view
  app.post("/api/track-view", async (req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { path } = req.body;

      if (!path) {
        return res.status(400).json({ error: "Path is required" });
      }

      // Get IP address from various possible headers
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                 (req.headers['x-real-ip'] as string) ||
                 req.socket.remoteAddress ||
                 'unknown';

      // Get geolocation data if available from headers (Railway/Cloudflare provide these)
      const country = (req.headers['cf-ipcountry'] as string) ||
                     (req.headers['x-vercel-ip-country'] as string) ||
                     null;
      const city = (req.headers['cf-ipcity'] as string) ||
                  (req.headers['x-vercel-ip-city'] as string) ||
                  null;
      const region = (req.headers['cf-region'] as string) ||
                    (req.headers['x-vercel-ip-country-region'] as string) ||
                    null;
      const timezone = (req.headers['cf-timezone'] as string) ||
                      (req.headers['x-vercel-ip-timezone'] as string) ||
                      null;

      const userAgent = req.headers['user-agent'] || null;
      const referrer = req.headers['referer'] || req.headers['referrer'] || null;

      await db.insert(visitorAnalytics).values({
        path,
        ip,
        country,
        city,
        region,
        timezone,
        userAgent,
        referrer,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking view:", error);
      // Don't fail the request if tracking fails
      res.json({ success: false });
    }
  });

  // Analytics API routes (protected - admin only)
  app.get("/api/analytics/summary", async (_req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { sql, count, countDistinct, desc } = await import("drizzle-orm");

      // Get summary statistics
      const [totalVisits] = await db.select({ value: count() }).from(visitorAnalytics);
      const [uniqueIPs] = await db.select({ value: countDistinct(visitorAnalytics.ip) }).from(visitorAnalytics);

      // Get top countries
      const topCountries = await db
        .select({
          country: visitorAnalytics.country,
          count: count(),
        })
        .from(visitorAnalytics)
        .where(sql`${visitorAnalytics.country} IS NOT NULL`)
        .groupBy(visitorAnalytics.country)
        .orderBy(desc(count()))
        .limit(10);

      // Get top pages
      const topPages = await db
        .select({
          path: visitorAnalytics.path,
          count: count(),
        })
        .from(visitorAnalytics)
        .groupBy(visitorAnalytics.path)
        .orderBy(desc(count()))
        .limit(10);

      res.json({
        totalVisits: totalVisits.value,
        uniqueVisitors: uniqueIPs.value,
        topCountries,
        topPages,
      });
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/recent", async (req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");

      const limit = parseInt(req.query.limit as string) || 50;

      const recentVisits = await db
        .select()
        .from(visitorAnalytics)
        .orderBy(desc(visitorAnalytics.timestamp))
        .limit(limit);

      res.json(recentVisits);
    } catch (error) {
      console.error("Recent analytics error:", error);
      res.status(500).json({ error: "Failed to fetch recent visits" });
    }
  });

  app.get("/api/analytics/countries", async (_req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { sql, count, desc } = await import("drizzle-orm");

      const countries = await db
        .select({
          country: visitorAnalytics.country,
          city: visitorAnalytics.city,
          count: count(),
        })
        .from(visitorAnalytics)
        .where(sql`${visitorAnalytics.country} IS NOT NULL`)
        .groupBy(visitorAnalytics.country, visitorAnalytics.city)
        .orderBy(desc(count()));

      res.json(countries);
    } catch (error) {
      console.error("Countries analytics error:", error);
      res.status(500).json({ error: "Failed to fetch country analytics" });
    }
  });

  app.get("/api/analytics/timeline", async (req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { sql, count } = await import("drizzle-orm");

      // Validate and sanitize days parameter
      const daysParam = req.query.days as string;
      let days = 14; // default
      if (daysParam) {
        const parsed = parseInt(daysParam, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
          days = parsed;
        }
      }

      const timeline = await db
        .select({
          date: sql<string>`DATE(${visitorAnalytics.timestamp})`,
          count: count(),
        })
        .from(visitorAnalytics)
        .where(sql`${visitorAnalytics.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
        .groupBy(sql`DATE(${visitorAnalytics.timestamp})`)
        .orderBy(sql`DATE(${visitorAnalytics.timestamp})`);

      res.json(timeline);
    } catch (error) {
      console.error("Timeline analytics error:", error);
      res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });

// Hansard Question Analyzer Routes

  // Upload and parse Hansard PDF for questions
  app.post("/api/hansard/parse-questions", uploadRateLimit, upload.single('pdf'), handleMulterError, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { HansardQuestionParser } = await import("./utils/hansard-question-parser");
      const parser = new HansardQuestionParser();

      // Parse the PDF
      const result = await parser.parsePdf(req.file.buffer);

      // Get constituency statistics
      const stats = parser.getConstituencyStats(result);

      // Get all MPs for name matching
      const allMps = await storage.getAllMps();
      const mpNameMatcher = new MPNameMatcher(allMps);

      // Persist parsed questions to database
      const persistedQuestions: any[] = [];
      for (const question of result.questions) {
        // Try to match MP name to database MP
        const matchedMp = mpNameMatcher.findBestMatch(question.mpName);

        if (matchedMp) {
          try {
            // Insert the question
            const newQuestion = await storage.insertParliamentaryQuestion({
              mpId: matchedMp.id,
              questionText: question.questionText,
              questionDate: result.sessionDate || new Date().toISOString().split('T')[0],
              answerText: null, // Not available in initial parse
              status: 'pending',
            });
            persistedQuestions.push(newQuestion);
          } catch (err) {
            console.error(`Failed to persist question for MP ${matchedMp.name}:`, err);
          }
        } else {
          console.warn(`Could not match MP name: ${question.mpName} (${question.constituency})`);
        }
      }

      console.log(`Persisted ${persistedQuestions.length} of ${result.questions.length} parsed questions`);

      res.json({
        sessionInfo: {
          sessionDate: result.sessionDate,
          sessionNumber: result.sessionNumber,
          parliamentTerm: result.parliamentTerm,
          sitting: result.sitting,
        },
        summary: {
          totalQuestions: result.totalQuestions,
          uniqueConstituencies: result.uniqueConstituencies.size,
          constituenciesList: Array.from(result.uniqueConstituencies),
          persistedCount: persistedQuestions.length,
        },
        questions: result.questions,
        constituencyStats: stats,
      });

    } catch (error) {
      console.error("Error parsing Hansard PDF:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to parse PDF" });
    }
  });

  // Get constituency question statistics across all parsed questions
  app.get("/api/hansard/constituency-question-stats", async (_req, res) => {
    try {
      const questions = await storage.getAllParliamentaryQuestions();
      const mps = await storage.getAllMps();

      // Create MP lookup map
      const mpMap = new Map(mps.map(mp => [mp.id, mp]));

      // Group questions by constituency
      const statsByConstituency = new Map<string, {
        constituency: string;
        state: string;
        questionCount: number;
        mpNames: Set<string>;
        mpIds: Set<string>;
      }>();

      questions.forEach(q => {
        const mp = mpMap.get(q.mpId);
        if (!mp) return;

        const constituency = mp.constituency;
        if (!statsByConstituency.has(constituency)) {
          statsByConstituency.set(constituency, {
            constituency,
            state: mp.state,
            questionCount: 0,
            mpNames: new Set(),
            mpIds: new Set(),
          });
        }

        const stats = statsByConstituency.get(constituency)!;
        stats.questionCount++;
        stats.mpNames.add(mp.name);
        stats.mpIds.add(mp.id);
      });

      // Convert to array and format
      const statsArray = Array.from(statsByConstituency.values()).map(stat => ({
        constituency: stat.constituency,
        state: stat.state,
        questionCount: stat.questionCount,
        mpNames: Array.from(stat.mpNames),
        mpIds: Array.from(stat.mpIds),
      })).sort((a, b) => b.questionCount - a.questionCount);

      res.json({
        totalConstituencies: statsArray.length,
        totalQuestions: questions.length,
        stats: statsArray,
      });

    } catch (error) {
      console.error("Error getting constituency question stats:", error);
      res.status(500).json({ error: "Failed to fetch constituency statistics" });
    }
  });

  // Get questions by constituency
  app.get("/api/hansard/questions/by-constituency/:constituency", async (req, res) => {
    try {
      const { constituency } = req.params;
      const questions = await storage.getAllParliamentaryQuestions();
      const mps = await storage.getAllMps();

      // Find MPs in this constituency
      const constituencyMps = mps.filter(mp => mp.constituency === constituency);
      const mpIds = new Set(constituencyMps.map(mp => mp.id));

      // Filter questions by these MPs
      const constituencyQuestions = questions.filter(q => mpIds.has(q.mpId));

      res.json({
        constituency,
        questionCount: constituencyQuestions.length,
        questions: constituencyQuestions,
        mps: constituencyMps,
      });

    } catch (error) {
      console.error("Error fetching constituency questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Cache for language analysis results
  let languageAnalysisCache: {
    data: any;
    timestamp: number;
    recordCount: number;
  } | null = null;
  const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (increased from 30 minutes)

  // Public endpoint to analyze Hansard transcripts for inappropriate language
  // Used by homepage to display MPs with unparliamentary language
  app.get("/api/admin/analyze-language", async (req, res) => {
    try {
      // Check if we have valid cached data
      const allRecords = await storage.getAllHansardRecords();
      const currentRecordCount = allRecords.length;
      const now = Date.now();

      // Use cache if: exists, not expired, and record count hasn't changed
      if (languageAnalysisCache &&
          (now - languageAnalysisCache.timestamp) < CACHE_TTL_MS &&
          languageAnalysisCache.recordCount === currentRecordCount) {
        console.log("📊 Returning cached language analysis results");
        return res.json(languageAnalysisCache.data);
      }

      console.log("🔍 Analyzing Hansard transcripts for inappropriate language...");

      // Common inappropriate/unparliamentary words in Malaysian parliament context
      // These include Malay and English terms that are considered unparliamentary
      const inappropriatePatterns = [
        // English swear words
        /\b(fuck|shit|damn|bloody|hell|stupid|idiot|fool|rubbish|nonsense|liar|corrupt|thief|crook)\b/gi,
        // Malay inappropriate terms commonly flagged in parliament
        /\b(bodoh|bangang|gila|sial|celaka|babi|anjing|sundal|bangsat|pukimak|lancau|setan|iblis|jahanam|haram|kafir|munafik|pengkhianat|penipu|perompak|pelacur|haramjadah|puki|lahanat|bohsia|cibai|nate)\b/gi,
        // Unparliamentary phrases
        /\b(shut up|tutup mulut|diam|go out|get out)\b/gi,
        // Accusations
        /\b(pembohong|bohong|tipu|menipu|rasuah|korup)\b/gi,
      ];

      console.log(`📊 Analyzing ${allRecords.length} Hansard records...`);

      const results: Array<{
        sessionNumber: string;
        sessionDate: string;
        mpId?: string;
        mpName?: string;
        constituency?: string;
        word: string;
        context: string;
        lineNumber: number;
      }> = [];

      const mpStats = new Map<string, { mpId: string; mpName: string; constituency: string; count: number; words: string[] }>();

      // OPTIMIZATION: Fetch all MPs once before the loop instead of inside the loop
      const allMps = await storage.getAllMps();
      
      // Create a lookup map for faster constituency matching
      const mpByConstituency = new Map<string, typeof allMps[0]>();
      for (const mp of allMps) {
        mpByConstituency.set(mp.constituency.toLowerCase(), mp);
      }

      for (const record of allRecords) {
        if (!record.transcript) continue;

        const lines = record.transcript.split('\n');
        let currentSpeaker: { mpId?: string; mpName?: string; constituency?: string } = {};

        // Speaker pattern to identify who is speaking
        const speakerPattern = /^(?:Tuan|Puan|Dato['']?|Datuk|Dr\.?|Yang Berhormat|Ir\.|Ts\.)\s+([^[\]:\n]+?)\s*\[([^\]]+)\]\s*:/i;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check if this line starts a new speaker
          const speakerMatch = line.match(speakerPattern);
          if (speakerMatch) {
            const extractedName = speakerMatch[1].trim();
            const extractedConstituency = speakerMatch[2].trim();

            // OPTIMIZATION: Use pre-built lookup map instead of calling storage in loop
            let matchedMp = mpByConstituency.get(extractedConstituency.toLowerCase());
            
            // Fallback: search by name if constituency match not found
            if (!matchedMp) {
              const lastName = extractedName.toLowerCase().split(' ').slice(-1)[0];
              matchedMp = allMps.find(mp => mp.name.toLowerCase().includes(lastName));
            }

            currentSpeaker = {
              mpId: matchedMp?.id,
              mpName: matchedMp?.name || extractedName,
              constituency: matchedMp?.constituency || extractedConstituency
            };
          }

          // Check for inappropriate words
          for (const pattern of inappropriatePatterns) {
            const matches = Array.from(line.matchAll(pattern));
            for (const match of matches) {
              const word = match[0].toLowerCase();
              const contextStart = Math.max(0, match.index! - 50);
              const contextEnd = Math.min(line.length, match.index! + match[0].length + 50);
              const context = line.substring(contextStart, contextEnd);

              results.push({
                sessionNumber: record.sessionNumber,
                sessionDate: record.sessionDate instanceof Date
                  ? record.sessionDate.toISOString().split('T')[0]
                  : String(record.sessionDate).split('T')[0],
                mpId: currentSpeaker.mpId,
                mpName: currentSpeaker.mpName,
                constituency: currentSpeaker.constituency,
                word,
                context: `...${context}...`,
                lineNumber: i + 1
              });

              // Update MP stats
              if (currentSpeaker.mpId) {
                const existing = mpStats.get(currentSpeaker.mpId) || {
                  mpId: currentSpeaker.mpId,
                  mpName: currentSpeaker.mpName || 'Unknown',
                  constituency: currentSpeaker.constituency || 'Unknown',
                  count: 0,
                  words: []
                };
                existing.count++;
                if (!existing.words.includes(word)) {
                  existing.words.push(word);
                }
                mpStats.set(currentSpeaker.mpId, existing);
              }
            }
          }
        }
      }

      // Sort MPs by usage count
      const mpRanking = Array.from(mpStats.values())
        .sort((a, b) => b.count - a.count);

      console.log(`✅ Analysis complete. Found ${results.length} instances.`);

      const responseData = {
        summary: {
          totalRecordsAnalyzed: allRecords.length,
          totalInstancesFound: results.length,
          uniqueMpsIdentified: mpStats.size
        },
        mpRanking, // Return all MPs, not just top 20
        recentInstances: results.slice(-50), // Last 50 instances
        wordFrequency: results.reduce((acc, r) => {
          acc[r.word] = (acc[r.word] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      // Cache the results
      languageAnalysisCache = {
        data: responseData,
        timestamp: Date.now(),
        recordCount: currentRecordCount
      };

      res.json(responseData);

    } catch (error) {
      console.error("Error analyzing language:", error);
      res.status(500).json({ error: "Failed to analyze", details: String(error) });
    }
  });

  // Admin endpoint to update MP social media data from scraped JSON
  app.post("/api/admin/update-mp-social-media", requireAdmin, async (req, res) => {
    try {
      console.log("🔄 Updating MP social media data...");

      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      const { eq, ilike } = await import('drizzle-orm');

      // Read the scraped data file
      const jsonPath = join(process.cwd(), 'scripts', 'mp-social-media-scraped.json');
      let scrapedData: Array<{
        name: string;
        parliamentCode: string;
        constituency: string;
        facebookUrl?: string | null;
        instagramUrl?: string | null;
        twitterUrl?: string | null;
        tiktokUrl?: string | null;
      }>;

      try {
        const data = await readFile(jsonPath, 'utf-8');
        scrapedData = JSON.parse(data);
      } catch (fileError) {
        console.error("Error reading social media data file:", fileError);
        return res.status(404).json({
          error: "Social media data file not found",
          details: "scripts/mp-social-media-scraped.json is missing"
        });
      }

      console.log(`Found ${scrapedData.length} social media records to process`);

      let updated = 0;
      let notFound = 0;
      let noData = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const socialMedia of scrapedData) {
        try {
          // Check if there's any social media data
          const hasSocialMedia = socialMedia.facebookUrl || socialMedia.instagramUrl ||
                                 socialMedia.twitterUrl || socialMedia.tiktokUrl;

          if (!hasSocialMedia) {
            noData++;
            continue;
          }

          // Try to find the MP in the database by parliament code first
          let matchingMps = await db
            .select()
            .from(mps)
            .where(eq(mps.parliamentCode, socialMedia.parliamentCode))
            .limit(1);

          if (matchingMps.length === 0) {
            // Fall back to constituency matching
            matchingMps = await db
              .select()
              .from(mps)
              .where(ilike(mps.constituency, `%${socialMedia.constituency}%`))
              .limit(5);
          }

          if (matchingMps.length === 0) {
            console.log(`⚠ No match found for: ${socialMedia.name} (${socialMedia.parliamentCode})`);
            notFound++;
            continue;
          }

          const bestMatch = matchingMps[0];

          // Update the MP with social media information
          const updateData: Record<string, string | null> = {};

          if (socialMedia.facebookUrl) updateData.facebookUrl = socialMedia.facebookUrl;
          if (socialMedia.instagramUrl) updateData.instagramUrl = socialMedia.instagramUrl;
          if (socialMedia.twitterUrl) updateData.twitterUrl = socialMedia.twitterUrl;
          if (socialMedia.tiktokUrl) updateData.tiktokUrl = socialMedia.tiktokUrl;

          if (Object.keys(updateData).length > 0) {
            await db
              .update(mps)
              .set(updateData)
              .where(eq(mps.id, bestMatch.id));

            console.log(`✓ Updated ${bestMatch.name}: ${Object.keys(updateData).join(', ')}`);
            updated++;
          }

        } catch (error) {
          console.error(`✗ Error processing ${socialMedia.name}:`, error);
          errorDetails.push(`${socialMedia.name}: ${String(error)}`);
          errors++;
        }
      }

      console.log(`✅ Social media update complete: ${updated} updated, ${notFound} not found, ${errors} errors`);

      res.json({
        message: "Social media update completed",
        results: {
          totalProcessed: scrapedData.length,
          updated,
          notFound,
          noData,
          errors,
          errorDetails: errorDetails.slice(0, 10)
        }
      });

    } catch (error) {
      console.error("Error updating MP social media:", error);
      res.status(500).json({ error: "Failed to update social media", details: String(error) });
    }
  });

  // Admin endpoint to scrape MP contact information from Parliament website
  app.post("/api/admin/scrape-mp-contacts", requireAdmin, async (req, res) => {
    try {
      console.log("🔄 Starting MP contact information scrape...");

      const axios = (await import('axios')).default;
      const cheerio = await import('cheerio');
      const { ilike } = await import('drizzle-orm');
      const https = await import('https');

      // Create HTTPS agent that bypasses SSL verification for Parliament website
      // (their certificate chain is sometimes incomplete)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });

      const MP_LIST_URL = 'https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr&';

      // Fetch the main MP list page
      console.log("📥 Fetching MP list from Parliament website...");
      let listHtml: string;
      try {
        const response = await axios.get(MP_LIST_URL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
            'Referer': 'https://www.parlimen.gov.my/',
          },
          timeout: 30000,
          httpsAgent,
        });
        listHtml = response.data;
      } catch (fetchError: any) {
        console.error("Failed to fetch Parliament website:", fetchError.message);
        return res.status(502).json({
          error: "Failed to fetch Parliament website",
          details: fetchError.message
        });
      }

      const $ = cheerio.load(listHtml);
      const mpLinks: Array<{ name: string; profileUrl: string }> = [];

      // Find MP profile links - they typically have parliament code in the URL
      $('a[href*="profil.html"], a[href*="uweb=dr"]').each((_, el) => {
        const href = $(el).attr('href');
        const name = $(el).text().trim();
        if (href && name && name.length > 2) {
          // Make absolute URL
          const fullUrl = href.startsWith('http')
            ? href
            : `https://www.parlimen.gov.my/${href.replace(/^\//, '')}`;
          mpLinks.push({ name, profileUrl: fullUrl });
        }
      });

      // Also try table-based structure
      $('table tr').each((_, row) => {
        const $row = $(row);
        const link = $row.find('a[href*="profil"], a[href*="uweb"]').first();
        if (link.length) {
          const href = link.attr('href');
          const name = link.text().trim() || $row.find('td').first().text().trim();
          if (href && name && name.length > 2) {
            const fullUrl = href.startsWith('http')
              ? href
              : `https://www.parlimen.gov.my/${href.replace(/^\//, '')}`;
            mpLinks.push({ name, profileUrl: fullUrl });
          }
        }
      });

      console.log(`📊 Found ${mpLinks.length} MP profile links to process`);

      // OPTIMIZATION: Load all MPs once and build fast lookup indexes
      const allMps = await storage.getAllMps();
      console.log(`📊 Loaded ${allMps.length} MPs for matching`);
      
      // Build lookup maps for faster matching
      const mpByConstituency = new Map<string, typeof allMps[0]>();
      const mpByNormalizedName = new Map<string, typeof allMps[0]>();
      const mpByParliamentCode = new Map<string, typeof allMps[0]>();
      
      // Helper function to normalize names (strip honorifics, titles, etc.)
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/\b(y\.?b\.?|yb|datuk?|dato['']?|sri|seri|dr\.?|ir\.?|ts\.?|tun|tan|haji|hajjah|puan|tuan|encik|cik|prof\.?|professor|hon\.?|yang berhormat)\b/gi, '')
          .replace(/[^a-z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      for (const mp of allMps) {
        // Index by constituency
        mpByConstituency.set(mp.constituency.toLowerCase(), mp);
        
        // Index by normalized name
        const normalizedName = normalizeName(mp.name);
        mpByNormalizedName.set(normalizedName, mp);
        
        // Also index by last name for fallback
        const lastName = normalizedName.split(' ').pop() || '';
        if (lastName.length > 2 && !mpByNormalizedName.has(lastName)) {
          mpByNormalizedName.set(lastName, mp);
        }
        
        // Index by parliament code if available
        if (mp.parliamentCode) {
          mpByParliamentCode.set(mp.parliamentCode.toLowerCase(), mp);
        }
      }

      // Helper function to find matching MP
      const findMatchingMp = (name: string, constituency?: string): typeof allMps[0] | undefined => {
        // Try constituency match first (most reliable)
        if (constituency) {
          const byConstituency = mpByConstituency.get(constituency.toLowerCase());
          if (byConstituency) return byConstituency;
        }
        
        // Try normalized name match
        const normalizedSearch = normalizeName(name);
        const byName = mpByNormalizedName.get(normalizedSearch);
        if (byName) return byName;
        
        // Try matching by last name
        const searchLastName = normalizedSearch.split(' ').pop() || '';
        if (searchLastName.length > 2) {
          const byLastName = mpByNormalizedName.get(searchLastName);
          if (byLastName) return byLastName;
        }
        
        // Fuzzy fallback: check if any normalized name contains the search or vice versa
        for (const [normalizedMpName, mp] of mpByNormalizedName.entries()) {
          if (normalizedMpName.includes(normalizedSearch) || normalizedSearch.includes(normalizedMpName)) {
            return mp;
          }
        }
        
        return undefined;
      };

      if (mpLinks.length === 0) {
        // Try extracting email directly from the list page if no profile links
        const emails: Array<{ name: string; email: string }> = [];
        $('a[href^="mailto:"]').each((_, el) => {
          const email = $(el).attr('href')?.replace('mailto:', '').trim();
          const name = $(el).closest('tr, .mp-item, .card').find('td:first-child, .name, h3, h4').first().text().trim()
            || $(el).parent().text().replace(email || '', '').trim();
          if (email && email.includes('@')) {
            emails.push({ name, email });
          }
        });

        if (emails.length > 0) {
          console.log(`📧 Found ${emails.length} emails directly on the list page`);
          
          let updated = 0;
          let notFound = 0;

          for (const { name, email } of emails) {
            // Use optimized matching
            const matchedMp = findMatchingMp(name);

            if (matchedMp) {
              await storage.updateMp(matchedMp.id, { email });
              updated++;
              console.log(`✓ Updated ${matchedMp.name}: ${email}`);
            } else {
              notFound++;
              console.log(`⚠ No match found for: ${name}`);
            }
          }

          return res.json({
            message: "Contact scrape completed (list page method)",
            results: {
              emailsFound: emails.length,
              updated,
              notFound
            }
          });
        }

        return res.status(404).json({
          error: "Could not find MP links on the Parliament website",
          details: "The website structure may have changed. Manual inspection required."
        });
      }

      // Deduplicate links
      const uniqueLinks = Array.from(new Map(mpLinks.map(l => [l.profileUrl, l])).values());
      console.log(`📊 Processing ${uniqueLinks.length} unique MP profiles...`);

      let updated = 0;
      let notFound = 0;
      let errors = 0;
      const errorDetails: string[] = [];
      const scrapedContacts: Array<{
        name: string;
        email?: string | null;
        telephone?: string | null;
        fax?: string | null;
        mobileNumber?: string | null;
        contactAddress?: string | null;
        serviceAddress?: string | null;
      }> = [];

      // Process profiles with delays to avoid rate limiting
      for (let i = 0; i < uniqueLinks.length; i++) {
        const link = uniqueLinks[i];
        try {
          // Add delay between requests
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const profileResponse = await axios.get(link.profileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
              'Referer': MP_LIST_URL,
            },
            timeout: 15000,
            httpsAgent,
          });

          const $profile = cheerio.load(profileResponse.data);

          // Extract contact information from profile page using TABLE-BASED extraction
          // The Parliament profile pages have a structured table with labeled rows:
          // - Email, No. Telefon, No. Faks, Alamat Surat-menyurat
          const contactInfo: Record<string, string | null> = {
            email: null,
            telephone: null,
            fax: null,
            mobileNumber: null,
            contactAddress: null,
            serviceAddress: null,
          };

          // Known site-wide emails to ignore
          const SITE_WIDE_EMAILS = [
            'info@parlimen.gov.my',
            'webmaster@parlimen.gov.my',
            'admin@parlimen.gov.my',
            'parlimen@parlimen.gov.my',
          ];

          // Helper function to extract value from table row by label
          const extractTableValue = (label: string): string | null => {
            let value: string | null = null;
            
            // Strategy 1: Look for table rows where first cell contains the label
            $profile('tr').each((_, row) => {
              if (value) return; // Already found
              const cells = $profile(row).find('td');
              if (cells.length >= 2) {
                const labelCell = $profile(cells[0]).text().trim();
                if (labelCell.toLowerCase().includes(label.toLowerCase())) {
                  const valueCell = $profile(cells[1]).text().trim();
                  if (valueCell && valueCell !== '-' && valueCell.length > 0) {
                    value = valueCell;
                  }
                }
              }
            });
            
            // Strategy 2: Look for div/span pairs or definition lists
            if (!value) {
              $profile('div, p, span').each((_, el) => {
                if (value) return;
                const text = $profile(el).text().trim();
                // Check if this element starts with the label
                const labelRegex = new RegExp(`^${label}[:\\s]+(.+)`, 'i');
                const match = text.match(labelRegex);
                if (match && match[1] && match[1] !== '-') {
                  value = match[1].trim();
                }
              });
            }
            
            return value;
          };

          // Extract Email from the "Email" row in the table
          const emailValue = extractTableValue('Email');
          if (emailValue) {
            // Validate it's a proper email format
            const emailMatch = emailValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) {
              const email = emailMatch[0].toLowerCase().trim();
              if (!SITE_WIDE_EMAILS.includes(email)) {
                contactInfo.email = email;
              }
            }
          }

          // Extract No. Telefon (Phone) from table
          const phoneValue = extractTableValue('No. Telefon') || extractTableValue('Telefon');
          if (phoneValue) {
            // Clean up phone number - remove extra spaces
            const cleanPhone = phoneValue.replace(/\s+/g, ' ').trim();
            if (cleanPhone.length >= 8) {
              contactInfo.telephone = cleanPhone;
            }
          }

          // Extract No. Faks (Fax) from table
          const faxValue = extractTableValue('No. Faks') || extractTableValue('Faks');
          if (faxValue) {
            const cleanFax = faxValue.replace(/\s+/g, ' ').trim();
            if (cleanFax.length >= 8) {
              contactInfo.fax = cleanFax;
            }
          }

          // Extract Alamat Surat-menyurat (Mailing Address) from table
          const addressValue = extractTableValue('Alamat Surat-menyurat') || extractTableValue('Alamat');
          if (addressValue) {
            contactInfo.contactAddress = addressValue;
          }

          // Check if we found any contact info
          const hasData = Object.values(contactInfo).some(v => v && v.length > 0);

          if (hasData) {
            scrapedContacts.push({ name: link.name, ...contactInfo });

            // Use optimized matching function (uses pre-built indexes)
            const matchedMp = findMatchingMp(link.name);

            if (matchedMp) {
              // Only update non-null fields
              const updateData: Record<string, string> = {};
              if (contactInfo.email) updateData.email = contactInfo.email;
              if (contactInfo.telephone) updateData.telephone = contactInfo.telephone;
              if (contactInfo.fax) updateData.fax = contactInfo.fax;
              if (contactInfo.mobileNumber) updateData.mobileNumber = contactInfo.mobileNumber;
              if (contactInfo.contactAddress) updateData.contactAddress = contactInfo.contactAddress;
              if (contactInfo.serviceAddress) updateData.serviceAddress = contactInfo.serviceAddress;

              if (Object.keys(updateData).length > 0) {
                await storage.updateMp(matchedMp.id, updateData);
                updated++;
                console.log(`✓ Updated ${matchedMp.name}: ${Object.keys(updateData).join(', ')}`);
              }
            } else {
              notFound++;
            }
          }

          // Log progress
          if ((i + 1) % 10 === 0) {
            console.log(`📊 Progress: ${i + 1}/${uniqueLinks.length} profiles processed`);
          }

        } catch (error: any) {
          console.error(`✗ Error processing ${link.name}:`, error.message);
          errorDetails.push(`${link.name}: ${error.message}`);
          errors++;
        }
      }

      console.log(`✅ MP contact scrape complete: ${updated} updated, ${notFound} not found, ${errors} errors`);

      res.json({
        message: "MP contact scrape completed",
        results: {
          totalProfilesFound: uniqueLinks.length,
          contactsScraped: scrapedContacts.length,
          updated,
          notFound,
          errors,
          errorDetails: errorDetails.slice(0, 10),
          sampleData: scrapedContacts.slice(0, 5)
        }
      });

    } catch (error) {
      console.error("Error scraping MP contacts:", error);
      res.status(500).json({ error: "Failed to scrape contacts", details: String(error) });
    }
  });

  // Admin endpoint to start bulk AI analysis of Hansard records
  app.post("/api/admin/analyze-hansard-bulk", requireAdmin, async (req, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({
          error: "AI service not configured",
          message: "Set OPENROUTER_API_KEY environment variable to enable AI analysis"
        });
      }

      const { forceReanalyze = false, limit = 0 } = req.body;

      // Check if job is already running
      const currentStatus = getAnalysisJobStatus();
      if (currentStatus && currentStatus.status === "running") {
        return res.status(409).json({
          error: "Analysis job already running",
          status: currentStatus
        });
      }

      // Start the job in the background
      console.log(`[Admin] Starting bulk Hansard AI analysis (forceReanalyze: ${forceReanalyze}, limit: ${limit})`);

      // Don't await - run in background
      runBulkHansardAnalysis({ forceReanalyze, limit, delayMs: 1500 })
        .catch(err => console.error("[Admin] Bulk analysis error:", err));

      res.json({
        message: "Bulk AI analysis started",
        status: "running"
      });

    } catch (error) {
      console.error("Error starting bulk analysis:", error);
      res.status(500).json({ error: "Failed to start analysis", details: String(error) });
    }
  });

  // Get status of bulk AI analysis job
  app.get("/api/admin/analyze-hansard-status", requireAdmin, async (req, res) => {
    try {
      const status = getAnalysisJobStatus();
      res.json({
        configured: isAIConfigured(),
        job: status
      });
    } catch (error) {
      console.error("Error getting analysis status:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Cancel bulk AI analysis job
  app.post("/api/admin/analyze-hansard-cancel", requireAdmin, async (req, res) => {
    try {
      const cancelled = cancelAnalysisJob();
      res.json({
        cancelled,
        message: cancelled ? "Cancellation requested" : "No running job to cancel"
      });
    } catch (error) {
      console.error("Error cancelling analysis:", error);
      res.status(500).json({ error: "Failed to cancel" });
    }
  });

  // Update MP cabinet roles (Ministers/Deputy Ministers)
  app.post("/api/admin/update-cabinet-roles", requireAdmin, async (req, res) => {
    try {
      console.log("🔄 Updating cabinet roles...");

      const { ilike, or, eq } = await import('drizzle-orm');

      // Cabinet Ministers
      const ministers = [
        { name: "Anwar Ibrahim", role: "Prime Minister & Minister of Finance" },
        { name: "Ahmad Zahid Hamidi", role: "Deputy Prime Minister, Minister of Rural & Regional Development" },
        { name: "Fadillah Yusof", role: "Deputy Prime Minister, Minister of Energy Transition & Water Transformation" },
        { name: "Rafizi Ramli", role: "Minister of Economy" },
        { name: "Nik Nazmi", role: "Minister of Natural Resources & Environmental Sustainability" },
        { name: "Mohamad Hasan", role: "Minister of Foreign Affairs" },
        { name: "Mohamed Khaled Nordin", role: "Minister of Defence" },
        { name: "Saifuddin Nasution", role: "Minister of Home Affairs" },
        { name: "Tengku Zafrul", role: "Minister of Investment, Trade & Industry" },
        { name: "Dzulkefly Ahmad", role: "Minister of Health" },
        { name: "Fadhlina Sidek", role: "Minister of Education" },
        { name: "Zambry Abd Kadir", role: "Minister of Higher Education" },
        { name: "Loke Siew Fook", role: "Minister of Transport" },
        { name: "Alexander Nanta Linggi", role: "Minister of Works" },
        { name: "Nga Kor Ming", role: "Minister of Housing & Local Government" },
        { name: "Mohamad Sabu", role: "Minister of Agriculture & Food Security" },
        { name: "Hannah Yeoh", role: "Minister of Youth & Sports" },
        { name: "Nancy Shukri", role: "Minister of Women, Family & Community Development" },
        { name: "Gobind Singh", role: "Minister of Digital" },
        { name: "Ahmad Fahmi", role: "Minister of Communications" },
        { name: "Steven Sim", role: "Minister of Human Resources" },
        { name: "Chang Lih Kang", role: "Minister of Science, Technology & Innovation" },
        { name: "Tiong King Sing", role: "Minister of Tourism, Arts & Culture" },
        { name: "Johari Abdul Ghani", role: "Minister of Plantation & Commodities" },
        { name: "Ewon Benedick", role: "Minister of Entrepreneurship & Cooperatives" },
        { name: "Armizan Mohd Ali", role: "Minister of Domestic Trade & Cost of Living" },
        { name: "Amir Hamzah", role: "Minister of Finance II" },
        { name: "Azalina Othman", role: "Minister in PM's Department (Law & Institutional Reform)" },
        { name: "Mohd Na'im Mokhtar", role: "Minister in PM's Department (Religious Affairs)" },
        { name: "Zaliha Mustafa", role: "Minister in PM's Department (Federal Territories)" },
        { name: "Aaron Ago Dagang", role: "Minister of National Unity" },
      ];

      // Deputy Ministers
      const deputyMinisters = [
        { name: "Lim Hui Ying", role: "Deputy Minister of Finance" },
        { name: "Rubiah Wang", role: "Deputy Minister of Rural & Regional Development" },
        { name: "Akmal Nasrullah", role: "Deputy Minister of Energy Transition & Public Utilities" },
        { name: "Hasbi Habibollah", role: "Deputy Minister of Transport" },
        { name: "Arthur Joseph Kurup", role: "Deputy Minister of Agriculture & Food Security" },
        { name: "Hanifah Hajar Taib", role: "Deputy Minister of Economy" },
        { name: "Aiman Athirah", role: "Deputy Minister of Local Government Development" },
        { name: "Mohamad Alamin", role: "Deputy Minister of Foreign Affairs" },
        { name: "Ahmad Maslan", role: "Deputy Minister of Works" },
        { name: "Shamsul Anuar", role: "Deputy Minister of Home Affairs" },
        { name: "Liew Chin Tong", role: "Deputy Minister of Investment, Trade & Industry" },
        { name: "Adly Zahari", role: "Deputy Minister of Defence" },
        { name: "Mohammad Yusof Apdal", role: "Deputy Minister of Science, Technology & Innovation" },
        { name: "Noraini Ahmad", role: "Deputy Minister of Women, Family & Community Development" },
        { name: "Kulasegaran", role: "Deputy Minister in PM's Department (Law & Institutional Reform)" },
        { name: "Huang Tiong Sii", role: "Deputy Minister of Natural Resources & Sustainability" },
        { name: "Ramanan", role: "Deputy Minister of Entrepreneur Development & Cooperatives" },
        { name: "Mustapha Sakmud", role: "Deputy Minister of Higher Education" },
        { name: "Teo Nie Ching", role: "Deputy Minister of Communications" },
        { name: "Wong Kah Woh", role: "Deputy Minister of Education" },
        { name: "Saraswathy Kandasami", role: "Deputy Minister of Unity" },
        { name: "Zulkifli Hassan", role: "Deputy Minister in PM's Department (Religious Affairs)" },
        { name: "Adam Adli", role: "Deputy Minister of Youth & Sports" },
        { name: "Fuziah Salleh", role: "Deputy Minister of Domestic Trade & Cost of Living" },
        { name: "Chan Foon Hin", role: "Deputy Minister of Plantation & Commodities" },
        { name: "Lukanisman Awang Sauni", role: "Deputy Minister of Health" },
        { name: "Ugak Anak Kumbong", role: "Deputy Minister of Digital" },
        { name: "Abdul Rahman Mohamad", role: "Deputy Minister of Human Resources" },
      ];

      const allCabinet = [...ministers, ...deputyMinisters];
      let updated = 0;
      let notFound = 0;
      const notFoundNames: string[] = [];

      for (const member of allCabinet) {
        const searchTerms = member.name.split(" ").filter(t => t.length > 2);

        const matchingMps = await db!
          .select()
          .from(mps)
          .where(
            or(
              ...searchTerms.map(term => ilike(mps.name, `%${term}%`))
            )
          )
          .limit(5);

        let bestMatch = null;
        let bestScore = 0;

        for (const mp of matchingMps) {
          const mpNameLower = mp.name.toLowerCase();
          let score = 0;
          for (const term of searchTerms) {
            if (mpNameLower.includes(term.toLowerCase())) {
              score++;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = mp;
          }
        }

        if (bestMatch && bestScore >= Math.min(2, searchTerms.length)) {
          await db!
            .update(mps)
            .set({ role: member.role })
            .where(eq(mps.id, bestMatch.id));

          console.log(`✅ ${member.name} → ${bestMatch.name}: ${member.role}`);
          updated++;
        } else {
          console.log(`❌ Not found: ${member.name}`);
          notFoundNames.push(member.name);
          notFound++;
        }
      }

      console.log(`✅ Cabinet roles update complete: ${updated} updated, ${notFound} not found`);

      res.json({
        message: "Cabinet roles update completed",
        results: {
          totalProcessed: allCabinet.length,
          updated,
          notFound,
          notFoundNames: notFoundNames.slice(0, 10)
        }
      });

    } catch (error) {
      console.error("Error updating cabinet roles:", error);
      res.status(500).json({ error: "Failed to update cabinet roles", details: String(error) });
    }
  });

  // Admin endpoint to update MP status (deceased/resigned)
  app.post("/api/admin/update-mp-status", requireAdmin, async (req, res) => {
    try {
      const { mpId, termEndDate, byElectionDate, byElectionNotes } = req.body;

      if (!mpId || !termEndDate) {
        return res.status(400).json({ error: "mpId and termEndDate are required" });
      }

      // Validate date format
      const endDate = new Date(termEndDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid termEndDate format" });
      }

      // Find the MP
      const [mp] = await db.select().from(mps).where(eq(mps.id, mpId)).limit(1);

      if (!mp) {
        return res.status(404).json({ error: "MP not found" });
      }

      console.log(`📝 Updating MP status for ${mp.name} (${mp.constituency})`);

      // Update MP record
      const updateData: any = {
        termEndDate: endDate,
        role: "Former Member of Parliament (Deceased)",
      };

      // Add optional fields if provided
      if (byElectionDate) {
        const electionDate = new Date(byElectionDate);
        if (!isNaN(electionDate.getTime())) {
          updateData.byElectionDate = electionDate;
        }
      }

      if (byElectionNotes) {
        updateData.byElectionNotes = byElectionNotes;
      }

      await db.update(mps)
        .set(updateData)
        .where(eq(mps.id, mpId));

      console.log(`✅ MP status updated successfully: ${mp.name}`);

      // Log the action
      await logAudit(
        getCurrentUsername(req),
        'UPDATE_MP_STATUS',
        `Updated MP status for ${mp.name} (${mp.constituency})`,
        { mpId, termEndDate, byElectionDate, byElectionNotes }
      );

      res.json({
        message: "MP status updated successfully",
        mp: {
          id: mp.id,
          name: mp.name,
          constituency: mp.constituency,
          termEndDate: endDate.toISOString(),
          byElectionDate: updateData.byElectionDate?.toISOString(),
          byElectionNotes: updateData.byElectionNotes,
        }
      });

    } catch (error) {
      console.error("Error updating MP status:", error);
      res.status(500).json({ error: "Failed to update MP status", details: String(error) });
    }
  });

  // ======================
  // Blog Posts API
  // ======================

  // Get all published blog posts (public)
  app.get("/api/blog-posts", async (req, res) => {
    try {
      const { desc } = await import("drizzle-orm");
      const { includeUnpublished } = req.query;

      let query = db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));

      // Only show published posts unless explicitly requesting unpublished (admin only)
      if (!includeUnpublished) {
        const { eq } = await import("drizzle-orm");
        query = query.where(eq(blogPosts.isPublished, true)) as any;
      }

      const posts = await query;
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by slug (public)
  app.get("/api/blog-posts/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const { eq } = await import("drizzle-orm");

      const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Only allow viewing unpublished posts if user is admin
      if (!post.isPublished && !getCurrentUsername(req)) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Get single blog post by ID (admin)
  app.get("/api/blog-posts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { eq } = await import("drizzle-orm");

      const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Create new blog post (admin only)
  app.post("/api/blog-posts", requireAdmin, mutationRateLimit, auditMiddleware('blog-post'), async (req, res) => {
    try {
      const validation = insertBlogPostSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid blog post data",
          details: validation.error.errors.map(e => e.message).join(", ")
        });
      }

      const username = getCurrentUsername(req);
      const newPost = {
        ...validation.data,
        createdBy: username || undefined,
      };

      const [created] = await db.insert(blogPosts).values(newPost).returning();

      console.log(`✅ Blog post created: ${created.title} by ${username}`);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating blog post:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: "A blog post with this slug already exists" });
      }
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Update blog post (admin only)
  app.patch("/api/blog-posts/:id", requireAdmin, mutationRateLimit, auditMiddleware('blog-post'), async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateBlogPostSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid blog post data",
          details: validation.error.errors.map(e => e.message).join(", ")
        });
      }

      const { eq } = await import("drizzle-orm");
      const updateData = {
        ...validation.data,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(blogPosts)
        .set(updateData)
        .where(eq(blogPosts.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      console.log(`✅ Blog post updated: ${updated.title} by ${getCurrentUsername(req)}`);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating blog post:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "A blog post with this slug already exists" });
      }
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  // Delete blog post (admin only)
  app.delete("/api/blog-posts/:id", requireAdmin, mutationRateLimit, auditMiddleware('blog-post'), async (req, res) => {
    try {
      const { id } = req.params;
      const { eq } = await import("drizzle-orm");

      const [deleted] = await db
        .delete(blogPosts)
        .where(eq(blogPosts.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      console.log(`✅ Blog post deleted: ${deleted.title} by ${getCurrentUsername(req)}`);
      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Increment blog post views
  app.post("/api/blog-posts/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const { eq, sql } = await import("drizzle-orm");

      const [updated] = await db
        .update(blogPosts)
        .set({ views: sql`${blogPosts.views} + 1` })
        .where(eq(blogPosts.id, id))
        .returning({ id: blogPosts.id, views: blogPosts.views });

      if (!updated) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json({ views: updated.views });
    } catch (error) {
      console.error("Error incrementing blog post views:", error);
      res.status(500).json({ error: "Failed to increment views" });
    }
  });

  // Admin endpoint to diagnose orphaned court cases and SPRM investigations
  app.get("/api/admin/diagnose-orphaned-records", requireAdmin, async (_req, res) => {
    try {
      console.log("🔍 Diagnosing orphaned court cases and SPRM investigations...");
      
      const { notInArray, inArray } = await import("drizzle-orm");
      
      // Get all MPs
      const allMps = await storage.getAllMps();
      const mpIds = new Set(allMps.map(mp => mp.id));
      const mpNameMatcher = new MPNameMatcher(allMps);
      
      // Get all court cases
      const allCourtCases = await storage.getAllCourtCases();
      
      // Get all SPRM investigations
      const allSprmInvestigations = await storage.getAllSprmInvestigations();
      
      // Find orphaned court cases (mp_id doesn't exist in mps table)
      const orphanedCourtCases = allCourtCases.filter(cc => !mpIds.has(cc.mpId));
      
      // Find orphaned SPRM investigations
      const orphanedSprmInvestigations = allSprmInvestigations.filter(si => !mpIds.has(si.mpId));
      
      // Try to match orphaned records to MPs using case titles
      const courtCaseSuggestions = orphanedCourtCases.map(cc => {
        // Extract MP name from title (e.g., "Public Prosecutor v Ahmad Zahid Hamidi - VL...")
        const titleMatch = cc.title.match(/(?:v|vs\.?)\s+([A-Za-z\s]+?)(?:\s*[-–—]|\s*$)/i);
        const extractedName = titleMatch ? titleMatch[1].trim() : null;
        
        let suggestedMpId: string | null = null;
        let suggestedMpName: string | null = null;
        let matchConfidence: number = 0;
        
        if (extractedName) {
          suggestedMpId = mpNameMatcher.matchName(extractedName);
          if (suggestedMpId) {
            const mp = allMps.find(m => m.id === suggestedMpId);
            suggestedMpName = mp?.name || null;
            matchConfidence = 0.9;
          }
        }
        
        return {
          id: cc.id,
          caseNumber: cc.caseNumber,
          title: cc.title,
          currentMpId: cc.mpId,
          extractedName,
          suggestedMpId,
          suggestedMpName,
          matchConfidence,
          canAutoFix: !!suggestedMpId
        };
      });
      
      const sprmSuggestions = orphanedSprmInvestigations.map(si => {
        // Extract MP name from title 
        const titleMatch = si.title.match(/(?:probe|investigation|case)\s*[-–—:]\s*([A-Za-z\s]+?)(?:\s*[-–—]|\s*$)/i);
        const extractedName = titleMatch ? titleMatch[1].trim() : null;
        
        let suggestedMpId: string | null = null;
        let suggestedMpName: string | null = null;
        let matchConfidence: number = 0;
        
        if (extractedName) {
          suggestedMpId = mpNameMatcher.matchName(extractedName);
          if (suggestedMpId) {
            const mp = allMps.find(m => m.id === suggestedMpId);
            suggestedMpName = mp?.name || null;
            matchConfidence = 0.9;
          }
        }
        
        return {
          id: si.id,
          caseNumber: si.caseNumber,
          title: si.title,
          currentMpId: si.mpId,
          extractedName,
          suggestedMpId,
          suggestedMpName,
          matchConfidence,
          canAutoFix: !!suggestedMpId
        };
      });
      
      const autoFixableCourtCases = courtCaseSuggestions.filter(s => s.canAutoFix).length;
      const autoFixableSprmInvestigations = sprmSuggestions.filter(s => s.canAutoFix).length;
      
      console.log(`📊 Found ${orphanedCourtCases.length} orphaned court cases (${autoFixableCourtCases} auto-fixable)`);
      console.log(`📊 Found ${orphanedSprmInvestigations.length} orphaned SPRM investigations (${autoFixableSprmInvestigations} auto-fixable)`);
      
      res.json({
        summary: {
          totalMps: allMps.length,
          totalCourtCases: allCourtCases.length,
          totalSprmInvestigations: allSprmInvestigations.length,
          orphanedCourtCases: orphanedCourtCases.length,
          orphanedSprmInvestigations: orphanedSprmInvestigations.length,
          autoFixableCourtCases,
          autoFixableSprmInvestigations
        },
        courtCaseSuggestions,
        sprmSuggestions
      });
    } catch (error) {
      console.error("Error diagnosing orphaned records:", error);
      res.status(500).json({ error: "Failed to diagnose orphaned records", details: String(error) });
    }
  });

  // Admin endpoint to fix orphaned court cases and SPRM investigations
  app.post("/api/admin/fix-orphaned-records", requireAdmin, mutationRateLimit, auditMiddleware('fix-orphaned'), async (req, res) => {
    try {
      console.log("🔧 Fixing orphaned court cases and SPRM investigations...");
      
      const { courtCaseFixes, sprmFixes } = req.body as {
        courtCaseFixes?: Array<{ id: string; newMpId: string }>;
        sprmFixes?: Array<{ id: string; newMpId: string }>;
      };
      
      const results = {
        courtCasesFixed: 0,
        courtCasesFailed: [] as string[],
        sprmInvestigationsFixed: 0,
        sprmInvestigationsFailed: [] as string[]
      };
      
      // Fix court cases
      if (courtCaseFixes && courtCaseFixes.length > 0) {
        for (const fix of courtCaseFixes) {
          try {
            const updated = await storage.updateCourtCase(fix.id, { mpId: fix.newMpId });
            if (updated) {
              results.courtCasesFixed++;
              console.log(`✓ Fixed court case ${fix.id} -> MP ${fix.newMpId}`);
            } else {
              results.courtCasesFailed.push(fix.id);
            }
          } catch (err) {
            console.error(`Failed to fix court case ${fix.id}:`, err);
            results.courtCasesFailed.push(fix.id);
          }
        }
      }
      
      // Fix SPRM investigations
      if (sprmFixes && sprmFixes.length > 0) {
        for (const fix of sprmFixes) {
          try {
            const updated = await storage.updateSprmInvestigation(fix.id, { mpId: fix.newMpId });
            if (updated) {
              results.sprmInvestigationsFixed++;
              console.log(`✓ Fixed SPRM investigation ${fix.id} -> MP ${fix.newMpId}`);
            } else {
              results.sprmInvestigationsFailed.push(fix.id);
            }
          } catch (err) {
            console.error(`Failed to fix SPRM investigation ${fix.id}:`, err);
            results.sprmInvestigationsFailed.push(fix.id);
          }
        }
      }
      
      console.log(`✅ Fix complete: ${results.courtCasesFixed} court cases, ${results.sprmInvestigationsFixed} SPRM investigations`);
      
      res.json({
        message: "Fix operation completed",
        results
      });
    } catch (error) {
      console.error("Error fixing orphaned records:", error);
      res.status(500).json({ error: "Failed to fix orphaned records", details: String(error) });
    }
  });

  // Admin endpoint to auto-fix all orphaned records that have suggested matches
  app.post("/api/admin/auto-fix-orphaned-records", requireAdmin, mutationRateLimit, auditMiddleware('auto-fix-orphaned'), async (req, res) => {
    try {
      console.log("🤖 Auto-fixing orphaned court cases and SPRM investigations...");
      
      const allMps = await storage.getAllMps();
      const mpIds = new Set(allMps.map(mp => mp.id));
      const mpNameMatcher = new MPNameMatcher(allMps);
      
      const allCourtCases = await storage.getAllCourtCases();
      const allSprmInvestigations = await storage.getAllSprmInvestigations();
      
      const results = {
        courtCasesFixed: 0,
        courtCasesFailed: [] as Array<{ id: string; title: string; reason: string }>,
        sprmInvestigationsFixed: 0,
        sprmInvestigationsFailed: [] as Array<{ id: string; title: string; reason: string }>
      };
      
      // Fix orphaned court cases
      for (const cc of allCourtCases) {
        if (!mpIds.has(cc.mpId)) {
          // Try to match from title
          const titleMatch = cc.title.match(/(?:v|vs\.?)\s+([A-Za-z\s]+?)(?:\s*[-–—]|\s*$)/i);
          const extractedName = titleMatch ? titleMatch[1].trim() : null;
          
          if (extractedName) {
            const suggestedMpId = mpNameMatcher.matchName(extractedName);
            if (suggestedMpId) {
              try {
                await storage.updateCourtCase(cc.id, { mpId: suggestedMpId });
                results.courtCasesFixed++;
                const mp = allMps.find(m => m.id === suggestedMpId);
                console.log(`✓ Fixed court case "${cc.caseNumber}" -> ${mp?.name}`);
              } catch (err) {
                results.courtCasesFailed.push({ id: cc.id, title: cc.title, reason: String(err) });
              }
            } else {
              results.courtCasesFailed.push({ id: cc.id, title: cc.title, reason: `No MP match found for "${extractedName}"` });
            }
          } else {
            results.courtCasesFailed.push({ id: cc.id, title: cc.title, reason: "Could not extract MP name from title" });
          }
        }
      }
      
      // Fix orphaned SPRM investigations
      for (const si of allSprmInvestigations) {
        if (!mpIds.has(si.mpId)) {
          // Try to match from title - SPRM titles might have different format
          const titleMatch = si.title.match(/(?:probe|investigation|case|against)\s*[-–—:]\s*([A-Za-z\s]+?)(?:\s*[-–—]|\s*$)/i) ||
                            si.title.match(/([A-Za-z\s]+?)(?:\s*[-–—])/i);
          const extractedName = titleMatch ? titleMatch[1].trim() : null;
          
          if (extractedName) {
            const suggestedMpId = mpNameMatcher.matchName(extractedName);
            if (suggestedMpId) {
              try {
                await storage.updateSprmInvestigation(si.id, { mpId: suggestedMpId });
                results.sprmInvestigationsFixed++;
                const mp = allMps.find(m => m.id === suggestedMpId);
                console.log(`✓ Fixed SPRM investigation "${si.caseNumber}" -> ${mp?.name}`);
              } catch (err) {
                results.sprmInvestigationsFailed.push({ id: si.id, title: si.title, reason: String(err) });
              }
            } else {
              results.sprmInvestigationsFailed.push({ id: si.id, title: si.title, reason: `No MP match found for "${extractedName}"` });
            }
          } else {
            results.sprmInvestigationsFailed.push({ id: si.id, title: si.title, reason: "Could not extract MP name from title" });
          }
        }
      }
      
      console.log(`✅ Auto-fix complete: ${results.courtCasesFixed} court cases, ${results.sprmInvestigationsFixed} SPRM investigations`);
      
      res.json({
        message: "Auto-fix operation completed",
        results
      });
    } catch (error) {
      console.error("Error auto-fixing orphaned records:", error);
      res.status(500).json({ error: "Failed to auto-fix orphaned records", details: String(error) });
    }
  });

  // ============ BILLS API ENDPOINTS ============
  
  // Import bills module
  const { 
    scrapeBills, 
    getBillsFromDatabase, 
    saveBillToDatabase,
    updateBillInDatabase,
    downloadAndSavePdf,
    getBillPdf,
    deleteBill,
    scrapeAndSaveBills 
  } = await import("./bills-scraper");
  
  // Get bills - try database first, scrape if data is sparse or stale
  app.get("/api/bills", async (_req, res) => {
    try {
      // First try to get bills from database
      const dbBills = await getBillsFromDatabase();
      
      // Minimum threshold for "complete" data - if we have fewer bills, data is likely incomplete
      const MIN_BILLS_THRESHOLD = 50;
      
      // Check if data is sparse (fewer than threshold bills suggests incomplete data)
      const isDataSparse = dbBills.length < MIN_BILLS_THRESHOLD;
      
      // Check if data is stale (older than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mostRecentScrape = dbBills[0]?.scrapedAt;
      const isDataStale = !mostRecentScrape || new Date(mostRecentScrape) < oneDayAgo;
      
      // If data is sparse or stale, try to refresh from live source
      if (isDataSparse || isDataStale) {
        console.log(`[Bills API] Data needs refresh - sparse: ${isDataSparse} (${dbBills.length} bills), stale: ${isDataStale}`);
        
        try {
          // Scrape and save to database
          const scrapeStats = await scrapeAndSaveBills();
          console.log(`[Bills API] Scraped ${scrapeStats.scraped} bills, saved ${scrapeStats.saved}, updated ${scrapeStats.updated}`);
          
          // Get fresh data from database after scrape
          const freshBills = await getBillsFromDatabase();
          
          return res.json({
            bills: freshBills,
            scrapedAt: new Date().toISOString(),
            sourceUrl: 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&',
            fromDatabase: true,
            refreshed: true,
          });
        } catch (scrapeError: any) {
          console.warn("[Bills API] Scraping failed, returning cached data:", scrapeError.message);
          // Fall through to return cached data
        }
      }
      
      // Return cached database data
      if (dbBills.length > 0) {
        return res.json({
          bills: dbBills,
          scrapedAt: dbBills[0]?.scrapedAt?.toISOString() || new Date().toISOString(),
          sourceUrl: 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&',
          fromDatabase: true,
        });
      }
      
      // If no bills in database, scrape live
      const result = await scrapeBills();
      
      if (result.error) {
        console.warn("[Bills API] Scraping failed:", result.error);
        return res.status(503).json(result);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ 
        error: "Failed to fetch bills", 
        details: error.message,
        bills: [],
        scrapedAt: new Date().toISOString(),
        sourceUrl: 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&'
      });
    }
  });
  
  // Get bills from database only
  app.get("/api/bills/stored", async (_req, res) => {
    try {
      const dbBills = await getBillsFromDatabase();
      res.json({
        bills: dbBills,
        count: dbBills.length,
      });
    } catch (error: any) {
      console.error("Error fetching stored bills:", error);
      res.status(500).json({ error: "Failed to fetch stored bills", details: error.message });
    }
  });
  
  // Scrape and save bills to database (admin only)
  app.post("/api/admin/bills/scrape", requireAdmin, async (_req, res) => {
    try {
      const stats = await scrapeAndSaveBills();
      res.json({
        message: "Bills scrape completed",
        ...stats,
      });
    } catch (error: any) {
      console.error("Error scraping and saving bills:", error);
      res.status(500).json({ error: "Failed to scrape and save bills", details: error.message });
    }
  });
  
  // Save a new bill manually (admin only)
  app.post("/api/admin/bills", requireAdmin, async (req, res) => {
    try {
      const { title, billNumber, introductionDate, status, fullTextUrl, sourceUrl } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const bill = await saveBillToDatabase({
        title,
        billNumber,
        introductionDate,
        status: status || 'Unknown',
        fullTextUrl,
        sourceUrl,
      });
      
      if (!bill) {
        return res.status(500).json({ error: "Failed to save bill" });
      }
      
      res.status(201).json(bill);
    } catch (error: any) {
      console.error("Error saving bill:", error);
      res.status(500).json({ error: "Failed to save bill", details: error.message });
    }
  });
  
  // Update a bill (admin only)
  app.patch("/api/admin/bills/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const bill = await updateBillInDatabase(id, updates);
      
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      res.json(bill);
    } catch (error: any) {
      console.error("Error updating bill:", error);
      res.status(500).json({ error: "Failed to update bill", details: error.message });
    }
  });
  
  // Delete a bill (admin only)
  app.delete("/api/admin/bills/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await deleteBill(id);
      
      if (!success) {
        return res.status(404).json({ error: "Bill not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ error: "Failed to delete bill", details: error.message });
    }
  });
  
  // Download and save PDF for a bill (admin only)
  app.post("/api/admin/bills/:id/download-pdf", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { pdfUrl } = req.body;
      const username = getCurrentUsername(req);
      
      if (!pdfUrl) {
        return res.status(400).json({ error: "PDF URL is required" });
      }
      
      const pdfFile = await downloadAndSavePdf(id, pdfUrl, username || undefined);
      
      if (!pdfFile) {
        return res.status(500).json({ error: "Failed to download and save PDF" });
      }
      
      res.json({
        message: "PDF downloaded and saved successfully",
        filename: pdfFile.originalFilename,
        sizeBytes: pdfFile.fileSizeBytes,
      });
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to download PDF", details: error.message });
    }
  });
  
  // Upload PDF for a bill (admin only)
  app.post("/api/admin/bills/:id/upload-pdf", requireAdmin, upload.single('pdf'), handleMulterError, async (req: any, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const username = getCurrentUsername(req);
      
      if (!file) {
        return res.status(400).json({ error: "PDF file is required" });
      }
      
      const { billPdfFiles } = await import("@shared/schema");
      const crypto = await import("crypto");
      const md5Hash = crypto.createHash('md5').update(file.buffer).digest('hex');
      
      const [savedPdf] = await db.insert(billPdfFiles).values({
        billId: id,
        originalFilename: file.originalname,
        fileSizeBytes: file.size,
        contentType: file.mimetype,
        pdfData: file.buffer,
        md5Hash,
        uploadedBy: username || undefined,
      }).returning();
      
      res.json({
        message: "PDF uploaded successfully",
        id: savedPdf.id,
        filename: savedPdf.originalFilename,
        sizeBytes: savedPdf.fileSizeBytes,
      });
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ error: "Failed to upload PDF", details: error.message });
    }
  });
  
  // Get PDF for a bill
  app.get("/api/bills/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      
      const pdfFile = await getBillPdf(id);
      
      if (!pdfFile) {
        return res.status(404).json({ error: "PDF not found for this bill" });
      }
      
      res.setHeader('Content-Type', pdfFile.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdfFile.originalFilename}"`);
      res.setHeader('Content-Length', pdfFile.fileSizeBytes);
      res.send(pdfFile.pdfData);
    } catch (error: any) {
      console.error("Error getting PDF:", error);
      res.status(500).json({ error: "Failed to get PDF", details: error.message });
    }
  });

  // Get bill impact analysis
  app.get("/api/bills/:id/impact", async (req, res) => {
    try {
      const { id } = req.params;
      
      const impact = await db.query.billImpacts.findFirst({
        where: eq(billImpacts.billId, id),
        orderBy: (billImpacts, { desc }) => [desc(billImpacts.generatedAt)],
      });
      
      res.json(impact || null);
    } catch (error: any) {
      console.error("Error getting bill impact:", error);
      res.status(500).json({ error: "Failed to get bill impact", details: error.message });
    }
  });

  // Generate bill impact analysis using AI
  app.post("/api/bills/:id/generate-impact", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, billNumber, status } = req.body;

      // First try to get bill from database
      let bill = await db.query.bills.findFirst({
        where: eq(bills.id, id),
      });

      // If not in database, save it first (from request body data)
      if (!bill && title) {
        // Insert the bill into database first to satisfy foreign key constraint
        await db.insert(bills).values({
          id,
          title,
          billNumber: billNumber || null,
          status: status || "Unknown",
          introductionDate: null,
          fullTextUrl: null,
          sourceUrl: null,
          scrapedAt: new Date(),
        });

        // Now fetch it back
        bill = await db.query.bills.findFirst({
          where: eq(bills.id, id),
        });
      }

      if (!bill || !bill.title) {
        return res.status(404).json({ error: "Bill not found. Please provide bill details." });
      }

      // Generate impact analysis using the multi-provider AI service (same as Hansard)
      const deepseekService = await import("./services/deepseek.js");
      const impactData = await deepseekService.analyzeBillImpact(
        bill.title,
        bill.billNumber,
        bill.status
      );
      
      // Save or update the impact in database
      const existingImpact = await db.query.billImpacts.findFirst({
        where: eq(billImpacts.billId, id),
      });
      
      if (existingImpact) {
        // Update existing
        await db.update(billImpacts)
          .set({
            summary: impactData.summary,
            impactType: impactData.impactType,
            keyPoints: impactData.keyPoints,
            affectedGroups: impactData.affectedGroups,
            generatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(billImpacts.id, existingImpact.id));
      } else {
        // Create new
        await db.insert(billImpacts).values({
          billId: id,
          summary: impactData.summary,
          impactType: impactData.impactType,
          keyPoints: impactData.keyPoints,
          affectedGroups: impactData.affectedGroups,
          generatedBy: "ai",
        });
      }
      
      // Return the newly generated impact
      const newImpact = await db.query.billImpacts.findFirst({
        where: eq(billImpacts.billId, id),
        orderBy: (billImpacts, { desc }) => [desc(billImpacts.generatedAt)],
      });
      
      res.json(newImpact);
    } catch (error: any) {
      console.error("Error generating bill impact:", error);
      res.status(500).json({ error: "Failed to generate bill impact", details: error.message });
    }
  });

  // ============ PARLIAMENTARY ORAL ANSWERS API ENDPOINTS ============

  // Import parliamentary answers module
  const {
    scrapeParliamentaryAnswers,
    getAnswersFromDatabase,
    saveAnswerToDatabase,
    updateAnswerInDatabase,
    downloadAndSaveAnswerPdf,
    getAnswerPdf,
    deleteAnswer,
    scrapeAndSaveAnswers,
    downloadAndParseAnswerPdf,
    batchProcessAnswerPdfs,
    fullSyncParlimen15OralAnswers,
    scrapeParlimen15Archive
  } = await import("./parliamentary-answers-scraper");

  // Get parliamentary oral answers - try database first, then scrape and auto-save
  app.get("/api/parliamentary-answers", async (_req, res) => {
    try {
      // First try to get answers from database
      const dbAnswers = await getAnswersFromDatabase();

      if (dbAnswers.length > 0) {
        return res.json({
          answers: dbAnswers,
          scrapedAt: dbAnswers[0]?.scrapedAt?.toISOString() || new Date().toISOString(),
          sourceUrl: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&',
          fromDatabase: true,
        });
      }

      // If no answers in database, scrape live and auto-save
      console.log("[Parliamentary Answers API] No data in database, scraping and saving...");
      const stats = await scrapeAndSaveAnswers();
      console.log(`[Parliamentary Answers API] Auto-saved: ${stats.saved} new, ${stats.updated} updated`);

      // Get the saved answers from database
      const savedAnswers = await getAnswersFromDatabase();

      if (savedAnswers.length > 0) {
        return res.json({
          answers: savedAnswers,
          scrapedAt: new Date().toISOString(),
          sourceUrl: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&',
          fromDatabase: true,
          autoSaved: true,
        });
      }

      // If still no answers, return scraped result
      const result = await scrapeParliamentaryAnswers();

      if (result.error) {
        console.warn("[Parliamentary Answers API] Scraping failed:", result.error);
        return res.status(503).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching parliamentary answers:", error);
      res.status(500).json({
        error: "Failed to fetch parliamentary oral answers",
        details: error.message,
        answers: [],
        scrapedAt: new Date().toISOString(),
        sourceUrl: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&'
      });
    }
  });

  // Get parliamentary answers from database only
  app.get("/api/parliamentary-answers/stored", async (_req, res) => {
    try {
      const dbAnswers = await getAnswersFromDatabase();
      res.json({
        answers: dbAnswers,
        count: dbAnswers.length,
      });
    } catch (error: any) {
      console.error("Error fetching stored parliamentary answers:", error);
      res.status(500).json({ error: "Failed to fetch stored parliamentary answers", details: error.message });
    }
  });

  // Scrape and save parliamentary answers to database (admin only)
  app.post("/api/admin/parliamentary-answers/scrape", requireAdmin, async (_req, res) => {
    try {
      const stats = await scrapeAndSaveAnswers();
      res.json({
        message: "Parliamentary answers scrape completed",
        ...stats,
      });
    } catch (error: any) {
      console.error("Error scraping and saving parliamentary answers:", error);
      res.status(500).json({ error: "Failed to scrape and save parliamentary answers", details: error.message });
    }
  });

  // Full sync of all Parlimen 15 oral answers - downloads all PDFs (admin only)
  app.post("/api/admin/parliamentary-answers/full-sync", requireAdmin, async (_req, res) => {
    try {
      console.log("[API] Starting full sync of Parlimen 15 oral answers...");
      const stats = await fullSyncParlimen15OralAnswers();
      res.json({
        message: "Full sync of Parlimen 15 oral answers completed",
        ...stats,
      });
    } catch (error: any) {
      console.error("Error in full sync:", error);
      res.status(500).json({ error: "Failed to complete full sync", details: error.message });
    }
  });

  // Get Parlimen 15 archive sessions (admin only)
  app.get("/api/admin/parliamentary-answers/archive", requireAdmin, async (_req, res) => {
    try {
      const result = await scrapeParlimen15Archive();
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching archive:", error);
      res.status(500).json({ error: "Failed to fetch archive", details: error.message });
    }
  });

  // Save a new parliamentary answer manually (admin only)
  app.post("/api/admin/parliamentary-answers", requireAdmin, async (req, res) => {
    try {
      const {
        questionNumber,
        title,
        questionerName,
        questionerMpId,
        answererName,
        answererMinistry,
        dateAsked,
        status,
        questionText,
        answerText,
        fullTextUrl,
        sourceUrl
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const answer = await saveAnswerToDatabase({
        questionNumber,
        title,
        questionerName,
        questionerMpId,
        answererName,
        answererMinistry,
        dateAsked,
        status: status || 'Unknown',
        questionText,
        answerText,
        fullTextUrl,
        sourceUrl,
      });

      if (!answer) {
        return res.status(500).json({ error: "Failed to save parliamentary answer" });
      }

      res.status(201).json(answer);
    } catch (error: any) {
      console.error("Error saving parliamentary answer:", error);
      res.status(500).json({ error: "Failed to save parliamentary answer", details: error.message });
    }
  });

  // Update a parliamentary answer (admin only)
  app.patch("/api/admin/parliamentary-answers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const answer = await updateAnswerInDatabase(id, updates);

      if (!answer) {
        return res.status(404).json({ error: "Parliamentary answer not found" });
      }

      res.json(answer);
    } catch (error: any) {
      console.error("Error updating parliamentary answer:", error);
      res.status(500).json({ error: "Failed to update parliamentary answer", details: error.message });
    }
  });

  // Delete a parliamentary answer (admin only)
  app.delete("/api/admin/parliamentary-answers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const success = await deleteAnswer(id);

      if (!success) {
        return res.status(404).json({ error: "Parliamentary answer not found or could not be deleted" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting parliamentary answer:", error);
      res.status(500).json({ error: "Failed to delete parliamentary answer", details: error.message });
    }
  });

  // Download and save PDF for a parliamentary answer (admin only)
  app.post("/api/admin/parliamentary-answers/:id/download-pdf", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { pdfUrl } = req.body;
      const username = getCurrentUsername(req);

      if (!pdfUrl) {
        return res.status(400).json({ error: "PDF URL is required" });
      }

      const pdfFile = await downloadAndSaveAnswerPdf(id, pdfUrl, username || undefined);

      if (!pdfFile) {
        return res.status(500).json({ error: "Failed to download and save PDF" });
      }

      res.json({
        message: "PDF downloaded and saved successfully",
        filename: pdfFile.originalFilename,
        sizeBytes: pdfFile.fileSizeBytes,
      });
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to download PDF", details: error.message });
    }
  });

  // Upload PDF for a parliamentary answer (admin only)
  app.post("/api/admin/parliamentary-answers/:id/upload-pdf", requireAdmin, upload.single('pdf'), handleMulterError, async (req: any, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const username = getCurrentUsername(req);

      if (!file) {
        return res.status(400).json({ error: "PDF file is required" });
      }

      const { parliamentaryAnswerPdfFiles } = await import("@shared/schema");
      const crypto = await import("crypto");
      const md5Hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      const [savedPdf] = await db.insert(parliamentaryAnswerPdfFiles).values({
        answerId: id,
        originalFilename: file.originalname,
        fileSizeBytes: file.size,
        contentType: file.mimetype,
        pdfData: file.buffer,
        md5Hash,
        uploadedBy: username || undefined,
      }).returning();

      res.json({
        message: "PDF uploaded successfully",
        id: savedPdf.id,
        filename: savedPdf.originalFilename,
        sizeBytes: savedPdf.fileSizeBytes,
      });
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ error: "Failed to upload PDF", details: error.message });
    }
  });

  // Get PDF for a parliamentary answer
  app.get("/api/parliamentary-answers/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;

      const pdfFile = await getAnswerPdf(id);

      if (!pdfFile) {
        return res.status(404).json({ error: "PDF not found for this parliamentary answer" });
      }

      res.setHeader('Content-Type', pdfFile.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdfFile.originalFilename}"`);
      res.setHeader('Content-Length', pdfFile.fileSizeBytes);
      res.send(pdfFile.pdfData);
    } catch (error: any) {
      console.error("Error getting PDF:", error);
      res.status(500).json({ error: "Failed to get PDF", details: error.message });
    }
  });

  // Download and analyze PDF for a parliamentary answer (admin only)
  app.post("/api/admin/parliamentary-answers/:id/analyze-pdf", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { pdfUrl } = req.body;

      if (!pdfUrl) {
        return res.status(400).json({ error: "PDF URL is required" });
      }

      const result = await downloadAndParseAnswerPdf(id, pdfUrl);

      if (!result.success) {
        return res.status(500).json({ error: "Failed to analyze PDF", details: result.error });
      }

      res.json({
        message: "PDF analyzed and answer updated successfully",
        parsed: result.parsed,
      });
    } catch (error: any) {
      console.error("Error analyzing PDF:", error);
      res.status(500).json({ error: "Failed to analyze PDF", details: error.message });
    }
  });

  // Batch process all PDFs for parliamentary answers (admin only)
  app.post("/api/admin/parliamentary-answers/batch-analyze-pdfs", requireAdmin, async (_req, res) => {
    try {
      const stats = await batchProcessAnswerPdfs();
      res.json({
        message: "Batch PDF processing completed",
        ...stats,
      });
    } catch (error: any) {
      console.error("Error batch processing PDFs:", error);
      res.status(500).json({ error: "Failed to batch process PDFs", details: error.message });
    }
  });

  // Analyze stored PDFs to extract questioner/ministry info (admin only)
  app.post("/api/admin/parliamentary-answers/analyze-stored-pdfs", requireAdmin, async (_req, res) => {
    try {
      console.log('[Admin API] Starting analysis of stored PDFs...');

      // Import schema tables
      const { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles, mps } = await import("@shared/schema");

      // Get all answers
      const answers = await db.select().from(parliamentaryOralAnswers);

      // Get all MPs for matching
      const allMps = await db.select().from(mps);

      const stats = {
        total: answers.length,
        processed: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };

      // Import parser
      const { ParliamentaryAnswersPdfParser } = await import("./parliamentary-answers-pdf-parser");

      for (const answer of answers) {
        // Check if PDF exists
        const pdfFiles = await db.select()
          .from(parliamentaryAnswerPdfFiles)
          .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id));

        if (pdfFiles.length === 0 || !pdfFiles[0].pdfData) {
          stats.skipped++;
          continue;
        }

        // Skip if already has questioner and ministry data
        if (answer.questionerName && answer.answererMinistry) {
          stats.skipped++;
          continue;
        }

        try {
          // Parse the PDF
          const parser = new ParliamentaryAnswersPdfParser(allMps);
          const parsed = await parser.parsePdf(pdfFiles[0].pdfData);

          if (!parsed) {
            stats.skipped++;
            continue;
          }

          // Update the answer with parsed data
          const updateData: any = {};
          if (parsed.questionNumber) updateData.questionNo = parsed.questionNumber;
          if (parsed.questionerName) updateData.questionerName = parsed.questionerName;
          if (parsed.questionerConstituency) updateData.questionerConstituency = parsed.questionerConstituency;
          if (parsed.questionerMpId) updateData.questionerMpId = parsed.questionerMpId;
          if (parsed.answererMinistry) updateData.answererMinistry = parsed.answererMinistry;
          if (parsed.answererName) updateData.answererName = parsed.answererName;
          if (parsed.questionText) updateData.questionText = parsed.questionText;
          if (parsed.answerText) updateData.answerText = parsed.answerText;
          if (parsed.sessionInfo) updateData.sessionInfo = parsed.sessionInfo;

          if (Object.keys(updateData).length > 0) {
            await db.update(parliamentaryOralAnswers)
              .set(updateData)
              .where(eq(parliamentaryOralAnswers.id, answer.id));

            stats.updated++;
          }

          stats.processed++;
        } catch (error: any) {
          console.error(`Error analyzing PDF for answer ${answer.id}:`, error.message);
          stats.failed++;
        }
      }

      console.log('[Admin API] Analysis complete:', stats);

      res.json({
        message: "Stored PDF analysis completed",
        ...stats,
      });
    } catch (error: any) {
      console.error("Error analyzing stored PDFs:", error);
      res.status(500).json({ error: "Failed to analyze stored PDFs", details: error.message });
    }
  });

  // ============ PARLIAMENTARY ANSWERS CRON ENDPOINTS ============

  // Import parliamentary answers cron functions
  const {
    triggerManualSync: triggerParliamentarySync,
    getSyncStatus: getParliamentarySyncStatus,
    getSyncLogs: getParliamentarySyncLogs,
  } = await import("./parliamentary-answers-cron");

  // Get parliamentary answers sync status
  app.get("/api/admin/parliamentary-answers/sync-status", requireAdmin, async (_req, res) => {
    try {
      const status = getParliamentarySyncStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error getting parliamentary answers sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // Get parliamentary answers sync logs
  app.get("/api/admin/parliamentary-answers/sync-logs", requireAdmin, async (_req, res) => {
    try {
      const logs = getParliamentarySyncLogs();
      res.json({
        totalLogs: logs.length,
        latestSync: logs[0] || null,
        logs,
      });
    } catch (error: any) {
      console.error("Error getting parliamentary answers sync logs:", error);
      res.status(500).json({ error: "Failed to get sync logs" });
    }
  });

  // Trigger manual parliamentary answers sync (scrape + download PDFs)
  app.post("/api/admin/parliamentary-answers/sync", requireAdmin, async (_req, res) => {
    try {
      const result = await triggerParliamentarySync();
      res.json({
        success: true,
        message: "Parliamentary answers sync completed",
        ...result,
      });
    } catch (error: any) {
      console.error("Error running parliamentary answers sync:", error);
      res.status(500).json({ error: error.message || "Failed to run sync" });
    }
  });

  // ============ COURT CASE SCRAPER ADMIN ENDPOINTS ============

  // Import the scraper and cron module
  const { courtCaseScraper } = await import("./court-case-scraper");
  const { triggerManualScrape, getScraperStatus, scheduleCourtCaseScraper } = await import("./court-case-cron");
  
  // Schedule the court case scraper cron job
  scheduleCourtCaseScraper();
  
  // Get scraper status
  app.get("/api/admin/court-case-scraper/status", requireAdmin, async (_req, res) => {
    try {
      const status = getScraperStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scraper status:", error);
      res.status(500).json({ error: "Failed to get scraper status" });
    }
  });
  
  // Trigger manual scrape
  app.post("/api/admin/court-case-scraper/run", requireAdmin, async (_req, res) => {
    try {
      const result = await triggerManualScrape();
      res.json({ 
        success: true, 
        message: "Scrape completed",
        ...result 
      });
    } catch (error: any) {
      console.error("Error running scraper:", error);
      res.status(500).json({ error: error.message || "Failed to run scraper" });
    }
  });
  
  // Manual search with custom keywords
  app.post("/api/admin/court-case-scraper/manual-search", requireAdmin, async (req, res) => {
    try {
      const { searchText } = req.body;
      
      if (!searchText || typeof searchText !== 'string' || searchText.trim().length < 3) {
        return res.status(400).json({ error: "Search text must be at least 3 characters" });
      }
      
      console.log(`[Admin] Manual search triggered for: "${searchText}"`);
      
      const result = await courtCaseScraper.manualSearch(searchText.trim());
      
      res.json({ 
        success: true, 
        message: `Manual search completed for "${searchText}"`,
        articlesScraped: result.articlesScraped,
        articlesWithData: result.articlesWithData,
        articles: result.articles.map(a => ({
          headline: a.headline,
          sourceName: a.sourceName,
          sourceUrl: a.sourceUrl,
        })),
      });
    } catch (error: any) {
      console.error("Error running manual search:", error);
      res.status(500).json({ error: error.message || "Failed to run manual search" });
    }
  });
  
  // Get pending news articles for review
  app.get("/api/admin/court-case-news", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const articles = await courtCaseScraper.getPendingArticles(limit);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching pending articles:", error);
      res.status(500).json({ error: "Failed to fetch pending articles" });
    }
  });
  
  // Approve a news article and create/update court case
  app.post("/api/admin/court-case-news/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const courtCaseData = req.body;
      const reviewedBy = getCurrentUsername(req) || "admin";
      
      // Validate required fields
      if (!courtCaseData.mpId || !courtCaseData.caseNumber || !courtCaseData.title || 
          !courtCaseData.courtLevel || !courtCaseData.status || !courtCaseData.charges || 
          !courtCaseData.filingDate) {
        return res.status(400).json({ error: "Missing required court case fields" });
      }
      
      const result = await courtCaseScraper.approveArticle(id, {
        ...courtCaseData,
        filingDate: new Date(courtCaseData.filingDate),
      }, reviewedBy);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error approving article:", error);
      res.status(500).json({ error: error.message || "Failed to approve article" });
    }
  });
  
  // Reject a news article
  app.post("/api/admin/court-case-news/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const reviewedBy = getCurrentUsername(req) || "admin";
      
      await courtCaseScraper.rejectArticle(id, reviewedBy);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error rejecting article:", error);
      res.status(500).json({ error: error.message || "Failed to reject article" });
    }
  });
  
  // Get all MPs for dropdown selection in admin UI
  app.get("/api/admin/mps-list", requireAdmin, async (_req, res) => {
    try {
      const allMps = await storage.getAllMps();
      const mpsList = allMps.map(mp => ({
        id: mp.id,
        name: mp.name,
        constituency: mp.constituency,
        party: mp.party,
      }));
      res.json(mpsList);
    } catch (error) {
      console.error("Error fetching MPs list:", error);
      res.status(500).json({ error: "Failed to fetch MPs list" });
    }
  });

  // =====================================
  // DUN (State Legislative Assembly) Routes
  // =====================================
  
  // Get all DUN members for a specific state
  app.get("/api/dun/:state/members", async (req, res) => {
    try {
      const { state } = req.params;
      // Capitalize first letter to match database format (e.g., "sarawak" -> "Sarawak")
      const capitalizedState = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
      const members = await storage.getDunMembersByState(capitalizedState);
      res.json(members);
    } catch (error) {
      console.error("Error fetching DUN members:", error);
      res.status(500).json({ error: "Failed to fetch DUN members" });
    }
  });

  // Get page view count for a specific DUN state
  app.get("/api/dun/:state/views", async (req, res) => {
    try {
      const { visitorAnalytics } = await import("@shared/schema");
      const { count, eq } = await import("drizzle-orm");
      
      const { state } = req.params;
      const path = `/dun/${state.toLowerCase()}`;
      
      const [result] = await db
        .select({ views: count() })
        .from(visitorAnalytics)
        .where(eq(visitorAnalytics.path, path));
      
      res.json({ views: result?.views || 0 });
    } catch (error) {
      console.error("Error fetching DUN page views:", error);
      res.status(500).json({ error: "Failed to fetch page views" });
    }
  });

  // Get a single DUN member by ID
  app.get("/api/dun/member/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const member = await storage.getDunMember(id);
      if (!member) {
        return res.status(404).json({ error: "DUN member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching DUN member:", error);
      res.status(500).json({ error: "Failed to fetch DUN member" });
    }
  });

  // Scrape DUN members for Sarawak (admin only)
  app.post("/api/admin/dun/sarawak/scrape", requireAdmin, async (_req, res) => {
    try {
      const { sarawakDunScraper } = await import("./sarawak-dun-scraper");
      
      console.log("[DUN Scraper] Starting Sarawak DUN scrape...");
      
      // First, delete existing Sarawak members
      const deletedCount = await storage.deleteAllDunMembersByState("Sarawak");
      console.log(`[DUN Scraper] Deleted ${deletedCount} existing Sarawak members`);
      
      // Scrape new data
      const scrapedMembers = await sarawakDunScraper.scrapeAllMembers();
      console.log(`[DUN Scraper] Scraped ${scrapedMembers.length} members`);
      
      // Insert new members
      let insertedCount = 0;
      for (const member of scrapedMembers) {
        try {
          await storage.createDunMember(member);
          insertedCount++;
        } catch (err) {
          console.error(`[DUN Scraper] Error inserting member ${member.constituencyCode}:`, err);
        }
      }
      
      console.log(`[DUN Scraper] Successfully inserted ${insertedCount} members`);
      
      res.json({
        success: true,
        message: `Successfully scraped and stored ${insertedCount} DUN members for Sarawak`,
        deletedCount,
        scrapedCount: scrapedMembers.length,
        insertedCount,
      });
    } catch (error: any) {
      console.error("[DUN Scraper] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to scrape Sarawak DUN data",
        details: error.stack
      });
    }
  });

  // Safe update: Add cabinet roles/salaries to existing Sarawak DUN members without deleting data
  app.post("/api/admin/dun/sarawak/update-cabinet", requireAdmin, async (_req, res) => {
    try {
      const { getCabinetMemberByConstituency, getCabinetAllowance } = await import("./sarawak-cabinet-data");
      
      console.log("[Cabinet Update] Starting safe cabinet data update for Sarawak DUN...");
      
      // Get existing DUN members (does NOT delete them)
      const existingMembers = await storage.getDunMembersByState("Sarawak");
      console.log(`[Cabinet Update] Found ${existingMembers.length} existing Sarawak DUN members`);
      
      if (existingMembers.length === 0) {
        return res.status(400).json({ 
          error: "No existing DUN members found. Please ensure DUN member data exists in the database." 
        });
      }
      
      let updatedCount = 0;
      let cabinetMembersFound = 0;
      let alreadyHadCabinet = 0;
      
      for (const member of existingMembers) {
        const cabinetData = getCabinetMemberByConstituency(member.constituencyCode);
        
        if (cabinetData) {
          cabinetMembersFound++;
          const allowance = getCabinetAllowance(cabinetData.role);
          
          // Check if already has cabinet data
          if (member.cabinetRole === cabinetData.role) {
            alreadyHadCabinet++;
            console.log(`[Cabinet Update] ${member.name} (${member.constituencyCode}) already has cabinet role: ${cabinetData.role}`);
            continue;
          }
          
          try {
            await storage.updateDunMember(member.id, {
              cabinetRole: cabinetData.role,
              cabinetBaseSalary: allowance.baseSalary,
              cabinetEntertainment: allowance.entertainment,
              cabinetSpecialAllowance: allowance.specialAllowance,
              cabinetTotalSalary: allowance.total,
            });
            updatedCount++;
            console.log(`[Cabinet Update] Updated ${member.name} (${member.constituencyCode}) with role: ${cabinetData.role}, total: RM ${allowance.total}`);
          } catch (err) {
            console.error(`[Cabinet Update] Error updating member ${member.constituencyCode}:`, err);
          }
        }
      }
      
      console.log(`[Cabinet Update] Complete: ${updatedCount} updated, ${alreadyHadCabinet} already had cabinet data, ${cabinetMembersFound} total cabinet members found`);
      
      res.json({
        success: true,
        message: `Successfully updated cabinet data for ${updatedCount} DUN members`,
        totalMembers: existingMembers.length,
        cabinetMembersFound,
        updatedCount,
        alreadyHadCabinet,
      });
    } catch (error: any) {
      console.error("[Cabinet Update] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to update cabinet data",
        details: error.stack
      });
    }
  });

  // Get DUN member count by state
  app.get("/api/dun/:state/count", async (req, res) => {
    try {
      const { state } = req.params;
      // Capitalize first letter to match database format
      const capitalizedState = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
      const members = await storage.getDunMembersByState(capitalizedState);
      res.json({ count: members.length, state: capitalizedState });
    } catch (error) {
      console.error("Error fetching DUN member count:", error);
      res.status(500).json({ error: "Failed to fetch DUN member count" });
    }
  });

  // Scrape DUN members for Selangor (admin only)
  app.post("/api/admin/dun/selangor/scrape", requireAdmin, async (_req, res) => {
    try {
      const { selangorDunScraper } = await import("./selangor-dun-scraper");
      
      console.log("[DUN Scraper] Starting Selangor DUN scrape...");
      
      // First, delete existing Selangor members
      const deletedCount = await storage.deleteAllDunMembersByState("Selangor");
      console.log(`[DUN Scraper] Deleted ${deletedCount} existing Selangor members`);
      
      // Scrape new data
      const scrapedMembers = await selangorDunScraper.scrapeAllMembers();
      console.log(`[DUN Scraper] Scraped ${scrapedMembers.length} members`);
      
      // Insert new members
      let insertedCount = 0;
      for (const member of scrapedMembers) {
        try {
          await storage.createDunMember(member);
          insertedCount++;
        } catch (err) {
          console.error(`[DUN Scraper] Error inserting member ${member.constituencyCode}:`, err);
        }
      }
      
      console.log(`[DUN Scraper] Successfully inserted ${insertedCount} members`);
      
      res.json({
        success: true,
        message: `Successfully scraped and stored ${insertedCount} DUN members for Selangor`,
        deletedCount,
        scrapedCount: scrapedMembers.length,
        insertedCount,
      });
    } catch (error: any) {
      console.error("[DUN Scraper] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to scrape Selangor DUN data",
        details: error.stack
      });
    }
  });

  // Scrape DOSM Kawasanku poverty data for Sarawak DUN constituencies (admin only)
  app.post("/api/admin/dun/sarawak/scrape-poverty", requireAdmin, async (_req, res) => {
    try {
      const { dosmKawasankuScraper } = await import("./dosm-kawasanku-scraper");
      
      console.log("[DOSM Scraper] Starting poverty data scrape for Sarawak DUN...");
      
      // Get existing DUN members
      const existingMembers = await storage.getDunMembersByState("Sarawak");
      console.log(`[DOSM Scraper] Found ${existingMembers.length} existing Sarawak DUN members`);
      
      if (existingMembers.length === 0) {
        return res.status(400).json({ 
          error: "No existing DUN members found. Please scrape member data first." 
        });
      }
      
      // Scrape poverty data
      const povertyData = await dosmKawasankuScraper.fetchAllSarawakDunData();
      console.log(`[DOSM Scraper] Scraped poverty data for ${povertyData.length} constituencies`);
      
      // Helper function to normalize constituency code for matching
      const normalizeCode = (code: string): string => {
        // Remove all non-alphanumeric characters and convert to uppercase
        return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      };
      
      // Update DUN members with poverty data
      let updatedCount = 0;
      let skippedCount = 0;
      for (const data of povertyData) {
        // Skip if all scraped values are null (no valid data)
        if (data.povertyRate === null && 
            data.householdIncome === null && 
            data.giniCoefficient === null && 
            data.unemploymentRate === null && 
            data.population === null) {
          console.log(`[DOSM Scraper] Skipping ${data.constituencyCode} - no valid data`);
          skippedCount++;
          continue;
        }
        
        // Find matching member by normalized constituency code
        const normalizedDataCode = normalizeCode(data.constituencyCode);
        const member = existingMembers.find(m => 
          normalizeCode(m.constituencyCode) === normalizedDataCode
        );
        
        if (!member) {
          console.log(`[DOSM Scraper] No matching member found for ${data.constituencyCode} (normalized: ${normalizedDataCode})`);
          skippedCount++;
          continue;
        }
        
        try {
          // Only update fields that have non-null values
          const updateFields: Record<string, number | null> = {};
          if (data.povertyRate !== null) updateFields.povertyRate = data.povertyRate;
          if (data.householdIncome !== null) updateFields.householdIncome = data.householdIncome;
          if (data.giniCoefficient !== null) updateFields.giniCoefficient = data.giniCoefficient;
          if (data.unemploymentRate !== null) updateFields.unemploymentRate = data.unemploymentRate;
          if (data.population !== null) updateFields.population = data.population;
          
          // Only update if there are fields to update
          if (Object.keys(updateFields).length > 0) {
            await storage.updateDunMember(member.id, updateFields);
            updatedCount++;
            console.log(`[DOSM Scraper] Updated ${data.constituencyCode} with ${Object.keys(updateFields).length} fields`);
          } else {
            console.log(`[DOSM Scraper] No fields to update for ${data.constituencyCode}`);
          }
        } catch (err) {
          console.error(`[DOSM Scraper] Error updating ${data.constituencyCode}:`, err);
        }
      }
      
      console.log(`[DOSM Scraper] Successfully updated ${updatedCount} members with poverty data, skipped ${skippedCount}`);
      
      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} DUN members with poverty data`,
        scrapedCount: povertyData.length,
        updatedCount,
        skippedCount,
      });
    } catch (error: any) {
      console.error("[DOSM Scraper] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to scrape DOSM poverty data",
        details: error.stack
      });
    }
  });

  // User Feedback routes
  app.post("/api/feedback", mutationRateLimit, async (req, res) => {
    try {
      const validatedData = insertUserFeedbackSchema.parse(req.body);
      const feedback = await storage.createUserFeedback(validatedData);
      res.status(201).json(feedback);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      }
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      const feedback = await storage.getAllUserFeedback({ status, limit });
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/feedback/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const validStatuses = ["pending", "reviewed", "resolved"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: pending, reviewed, resolved" });
      }
      const username = getCurrentUsername(req);
      const updated = await storage.updateUserFeedbackStatus(id, status, username);
      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback status:", error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });

  // Server is now passed in from index.ts, no need to create it here
}
