import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertCourtCaseSchema, 
  insertSprmInvestigationSchema, 
  updateSprmInvestigationSchema,
  insertLegislativeProposalSchema,
  insertDebateParticipationSchema,
  insertParliamentaryQuestionSchema,
  insertHansardRecordSchema,
  updateHansardRecordSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all MPs
  app.get("/api/mps", async (_req, res) => {
    try {
      const mps = await storage.getAllMps();
      res.json(mps);
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

  const httpServer = createServer(app);

  return httpServer;
}
