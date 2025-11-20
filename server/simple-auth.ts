import { type Request, type Response, type NextFunction } from "express";
import type { Express } from "express";
import session from "express-session";
import { pool } from "./db";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { adminUsers } from "../shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request type to include session
declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    username?: string;
    userId?: string;
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
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password are required" });
      }

      // Find user by username
      const [user] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, username));

      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, error: "Account is inactive" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: "Invalid username or password" });
      }

      // Update last login time
      await db
        .update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, user.id));

      // Set session
      req.session.isAdmin = true;
      req.session.username = user.username;
      req.session.userId = user.id;

      res.json({
        success: true,
        user: {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, error: "Login failed" });
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
    res.json({
      isAdmin: req.session.isAdmin || false,
      username: req.session.username || null,
      userId: req.session.userId || null,
    });
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

// Helper function to get current admin username from session
export function getCurrentUsername(req: Request): string | undefined {
  return req.session.username;
}

// Helper function to hash password for creating new admin users
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
