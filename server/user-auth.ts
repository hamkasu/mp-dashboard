/**
 * Copyright by Calmic Sdn Bhd
 *
 * Public user authentication routes.
 * Completely separate from the admin auth system (simple-auth.ts).
 *
 * Routes registered:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   GET  /api/auth/verify-email
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { users, subscriptions, subscriptionPlans } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { authRateLimit, mutationRateLimit } from "./middleware/security";
import { isEmailConfigured } from "./email";
import { Resend } from "resend";
import { isPremiumUser } from "./subscription-middleware";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const BASE_URL = process.env.BASE_URL || "https://myparliament.calmic.com.my";

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  if (!resend) return;
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your MyParliament account",
    html: `
      <p>Hi ${name},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— MyParliament Team</p>
    `,
  });
}

async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  if (!resend) return;
  const link = `${BASE_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your MyParliament password",
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you did not request a password reset, you can ignore this email.</p>
      <p>— MyParliament Team</p>
    `,
  });
}

// ─── route registration ───────────────────────────────────────────────────────

export function setupUserAuth(app: Express): void {
  /**
   * POST /api/auth/register
   * Body: { email, name, password }
   */
  app.post("/api/auth/register", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { email, name, password } = req.body as {
        email?: string;
        name?: string;
        password?: string;
      };

      if (!email || !name || !password) {
        return res.status(400).json({ error: "email, name, and password are required" });
      }

      const emailLower = email.toLowerCase().trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Check for duplicate
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, emailLower));

      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const emailVerificationToken = generateToken();

      const [newUser] = await db
        .insert(users)
        .values({
          email: emailLower,
          name: name.trim(),
          passwordHash,
          emailVerificationToken,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerified: users.emailVerified,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
        });

      // Send verification email (non-blocking)
      sendVerificationEmail(emailLower, name.trim(), emailVerificationToken).catch((err) =>
        console.error("[UserAuth] Failed to send verification email:", err)
      );

      // Log user in immediately after registration
      req.session.publicUserId = newUser.id;
      req.session.isPremium = false;

      return res.status(201).json({
        user: newUser,
        message: isEmailConfigured()
          ? "Account created. Please check your email to verify your address."
          : "Account created.",
      });
    } catch (error) {
      console.error("[UserAuth] Register error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  app.post("/api/auth/login", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const emailLower = email.toLowerCase().trim();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, emailLower));

      if (!user || !user.passwordHash) {
        // Constant-time response to prevent user enumeration
        await bcrypt.hash("dummy", 12);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check subscription status and cache it in session
      const premium = await isPremiumUser(user.id);

      req.session.publicUserId = user.id;
      req.session.isPremium = premium;

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        },
        isPremium: premium,
      });
    } catch (error) {
      console.error("[UserAuth] Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Only destroy the public-user session fields; leave admin session intact
    req.session.publicUserId = undefined;
    req.session.isPremium = undefined;

    // If there is no admin session either, destroy the whole session
    if (!req.session.isAdmin) {
      req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        return res.json({ success: true });
      });
    } else {
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        return res.json({ success: true });
      });
    }
  });

  /**
   * GET /api/auth/me
   * Returns current public user + subscription status.
   */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const userId = req.session.publicUserId;

      if (!userId) {
        return res.json({ user: null, isPremium: false });
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerified: users.emailVerified,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        req.session.publicUserId = undefined;
        req.session.isPremium = undefined;
        return res.json({ user: null, isPremium: false });
      }

      // Refresh premium status
      const premium = await isPremiumUser(userId);
      req.session.isPremium = premium;

      return res.json({ user, isPremium: premium });
    } catch (error) {
      console.error("[UserAuth] /me error:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  /**
   * GET /api/auth/verify-email?token=<token>
   * Verifies email and redirects to frontend.
   */
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query as { token?: string };

      if (!token) {
        return res.status(400).send("Missing verification token");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token));

      if (!user) {
        return res.status(400).send("Invalid or expired verification token");
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return res.redirect(`${BASE_URL}/?verified=1`);
    } catch (error) {
      console.error("[UserAuth] Verify email error:", error);
      return res.status(500).send("Verification failed");
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Body: { email }
   */
  app.post("/api/auth/forgot-password", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { email } = req.body as { email?: string };

      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }

      const emailLower = email.toLowerCase().trim();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, emailLower));

      // Always return success to prevent user enumeration
      if (user) {
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db
          .update(users)
          .set({
            passwordResetToken: token,
            passwordResetExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        sendPasswordResetEmail(user.email, user.name, token).catch((err) =>
          console.error("[UserAuth] Failed to send reset email:", err)
        );
      }

      return res.json({ message: "If an account exists for that email, a reset link has been sent." });
    } catch (error) {
      console.error("[UserAuth] Forgot password error:", error);
      return res.status(500).json({ error: "Request failed" });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Body: { token, password }
   */
  app.post("/api/auth/reset-password", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };

      if (!token || !password) {
        return res.status(400).json({ error: "token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.passwordResetToken, token),
            gt(users.passwordResetExpiresAt, new Date())
          )
        );

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await db
        .update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return res.json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
      console.error("[UserAuth] Reset password error:", error);
      return res.status(500).json({ error: "Password reset failed" });
    }
  });
}
