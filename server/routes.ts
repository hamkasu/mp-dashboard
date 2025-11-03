import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertCourtCaseSchema, insertSprmInvestigationSchema, updateSprmInvestigationSchema } from "@shared/schema";

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

  const httpServer = createServer(app);

  return httpServer;
}
