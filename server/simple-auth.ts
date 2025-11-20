import { type Request, type Response, type NextFunction } from "express";
import type { Express } from "express";
import session from "express-session";
import { pool } from "./db";
import connectPg from "connect-pg-simple";

// Extend Express Request type to include session
declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
  }
}

// Setup session middleware
export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);

  app.use(
    session({
      store: new PostgresSessionStore({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );

  // Login endpoint
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";

    if (password === adminPassword) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  // Logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
      } else {
        res.json({ success: true });
      }
    });
  });

  // Check auth status endpoint
  app.get("/api/admin/auth-status", (req, res) => {
    res.json({ isAdmin: req.session.isAdmin || false });
  });
}

// Middleware to require admin authentication
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized - Admin access required" });
  }
}
