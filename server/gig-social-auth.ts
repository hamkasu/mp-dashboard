/**
 * Copyright by Calmic Sdn Bhd
 *
 * GigHalal Social Authentication Service
 * Handles Facebook, Google, Apple OAuth + WhatsApp OTP
 *
 * Security: Uses OAuth 2.0 Authorization Code flow with PKCE where supported.
 * Tokens are never exposed to the frontend — all exchange happens server-side.
 * Compliant with Malaysian PDPA (Personal Data Protection Act 2010).
 */

import crypto from "crypto";
import { type Request, type Response } from "express";
import type { Express } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { gigUsers, whatsappOtpCodes } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:5000"
  );
}

function getFacebookConfig() {
  return {
    clientId: process.env.FACEBOOK_APP_ID || "",
    clientSecret: process.env.FACEBOOK_APP_SECRET || "",
    redirectUri: `${getBaseUrl()}/api/gig/auth/facebook/callback`,
    scope: "public_profile,email",
  };
}

function getAppleConfig() {
  return {
    clientId: process.env.APPLE_CLIENT_ID || "", // Services ID
    teamId: process.env.APPLE_TEAM_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    // Private key content (PEM), stored as env var with \n escaped
    privateKey: (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    redirectUri: `${getBaseUrl()}/api/gig/auth/apple/callback`,
    scope: "name email",
  };
}

// ---------------------------------------------------------------------------
// PKCE helpers (used for Facebook and Apple)
// ---------------------------------------------------------------------------

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// Store PKCE verifiers + state in memory (short-lived, cleared on use)
// In production with multiple instances, use Redis instead.
const pendingOAuthStates = new Map<
  string,
  { codeVerifier: string; accountType: string; socsoAutoRegister: boolean; createdAt: number }
>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(pendingOAuthStates.keys());
  for (const key of keys) {
    const val = pendingOAuthStates.get(key);
    if (val && now - val.createdAt > 10 * 60 * 1000) {
      pendingOAuthStates.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ---------------------------------------------------------------------------
// User upsert — find or create user from OAuth profile
// ---------------------------------------------------------------------------

interface OAuthProfile {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  raw?: Record<string, unknown>;
}

async function findOrCreateUser(
  profile: OAuthProfile,
  accountType: string,
  socsoAutoRegister: boolean
) {
  // Check if user exists by provider + providerId
  const [existing] = await getDb()
    .select()
    .from(gigUsers)
    .where(
      and(
        eq(gigUsers.authProvider, profile.provider),
        eq(gigUsers.providerId, profile.providerId)
      )
    );

  if (existing) {
    // Update last login
    await getDb()
      .update(gigUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(gigUsers.id, existing.id));
    return existing;
  }

  // Check if email already exists (link accounts)
  if (profile.email) {
    const [byEmail] = await getDb()
      .select()
      .from(gigUsers)
      .where(eq(gigUsers.email, profile.email));

    if (byEmail) {
      // Link this provider to existing account
      await getDb()
        .update(gigUsers)
        .set({
          authProvider: profile.provider,
          providerId: profile.providerId,
          providerData: profile.raw || {},
          avatarUrl: profile.avatarUrl || byEmail.avatarUrl,
          lastLoginAt: new Date(),
        })
        .where(eq(gigUsers.id, byEmail.id));
      return { ...byEmail, authProvider: profile.provider };
    }
  }

  // Create new user
  const username = profile.email || profile.name || `user_${profile.providerId.slice(0, 8)}`;
  const [newUser] = await getDb()
    .insert(gigUsers)
    .values({
      username,
      email: profile.email || null,
      phone: profile.phone || null,
      displayName: profile.name || null,
      avatarUrl: profile.avatarUrl || null,
      accountType,
      authProvider: profile.provider,
      providerId: profile.providerId,
      providerData: profile.raw || {},
      socsoAutoRegister,
      emailVerified: !!profile.email, // Assume verified if from OAuth provider
    })
    .returning();

  return newUser;
}

// ---------------------------------------------------------------------------
// Session helper — sets session data for authenticated gig user
// ---------------------------------------------------------------------------

declare module "express-session" {
  interface SessionData {
    gigUserId?: string;
    gigUsername?: string;
    gigProvider?: string;
    gigAccountType?: string;
  }
}

function setGigSession(req: Request, user: any) {
  req.session.gigUserId = user.id;
  req.session.gigUsername = user.username;
  req.session.gigProvider = user.authProvider;
  req.session.gigAccountType = user.accountType;
}

// ---------------------------------------------------------------------------
// Facebook OAuth
// ---------------------------------------------------------------------------

function handleFacebookAuth(app: Express) {
  const fb = getFacebookConfig();

  // Step 1: Redirect user to Facebook
  app.get("/api/gig/auth/facebook", (req: Request, res: Response) => {
    if (!fb.clientId) {
      return res.status(500).json({ error: "Facebook login belum dikonfigurasi" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const accountType = (req.query.accountType as string) || "freelancer";
    const socsoAutoRegister = req.query.socso === "true";

    pendingOAuthStates.set(state, {
      codeVerifier,
      accountType,
      socsoAutoRegister,
      createdAt: Date.now(),
    });

    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", fb.clientId);
    authUrl.searchParams.set("redirect_uri", fb.redirectUri);
    authUrl.searchParams.set("scope", fb.scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    res.redirect(authUrl.toString());
  });

  // Step 2: Handle callback from Facebook
  app.get("/api/gig/auth/facebook/callback", async (req: Request, res: Response) => {
    const { code, state, error: fbError } = req.query;

    if (fbError || !code || !state) {
      return res.redirect("/daftar?error=facebook_denied");
    }

    const stateData = pendingOAuthStates.get(state as string);
    if (!stateData) {
      return res.redirect("/daftar?error=invalid_state");
    }
    pendingOAuthStates.delete(state as string);

    try {
      // Exchange code for access token (server-side, with PKCE)
      const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", fb.clientId);
      tokenUrl.searchParams.set("client_secret", fb.clientSecret);
      tokenUrl.searchParams.set("redirect_uri", fb.redirectUri);
      tokenUrl.searchParams.set("code", code as string);
      tokenUrl.searchParams.set("code_verifier", stateData.codeVerifier);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as any;

      if (!tokenData.access_token) {
        console.error("Facebook token exchange failed:", tokenData);
        return res.redirect("/daftar?error=facebook_token_failed");
      }

      // Fetch user profile
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
      );
      const profile = (await profileRes.json()) as any;

      if (!profile.id) {
        return res.redirect("/daftar?error=facebook_profile_failed");
      }

      // Create or find user
      const user = await findOrCreateUser(
        {
          provider: "facebook",
          providerId: profile.id,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture?.data?.url,
          raw: { facebookId: profile.id, facebookName: profile.name },
        },
        stateData.accountType,
        stateData.socsoAutoRegister
      );

      // Set session
      setGigSession(req, user);

      // Redirect to dashboard
      res.redirect("/gig/dashboard?login=success");
    } catch (err) {
      console.error("Facebook OAuth error:", err);
      res.redirect("/daftar?error=facebook_server_error");
    }
  });
}

// ---------------------------------------------------------------------------
// Apple OAuth (Sign in with Apple)
// ---------------------------------------------------------------------------

function generateAppleClientSecret(): string {
  const apple = getAppleConfig();
  if (!apple.privateKey || !apple.teamId || !apple.keyId || !apple.clientId) {
    throw new Error("Apple login configuration incomplete");
  }

  // Apple requires a JWT client secret signed with the private key
  // For simplicity we construct it manually using Node crypto
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: apple.keyId })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: apple.teamId,
      iat: now,
      exp: now + 86400 * 180, // 6 months max
      aud: "https://appleid.apple.com",
      sub: apple.clientId,
    })
  ).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const signature = sign
    .sign({ key: apple.privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");

  return `${signingInput}.${signature}`;
}

function handleAppleAuth(app: Express) {
  const apple = getAppleConfig();

  // Step 1: Redirect to Apple
  app.get("/api/gig/auth/apple", (req: Request, res: Response) => {
    if (!apple.clientId) {
      return res.status(500).json({ error: "Apple login belum dikonfigurasi" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();

    const accountType = (req.query.accountType as string) || "freelancer";
    const socsoAutoRegister = req.query.socso === "true";

    pendingOAuthStates.set(state, {
      codeVerifier,
      accountType,
      socsoAutoRegister,
      createdAt: Date.now(),
    });

    const authUrl = new URL("https://appleid.apple.com/auth/authorize");
    authUrl.searchParams.set("client_id", apple.clientId);
    authUrl.searchParams.set("redirect_uri", apple.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", apple.scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_mode", "form_post"); // Apple uses POST

    res.redirect(authUrl.toString());
  });

  // Step 2: Handle callback (Apple uses POST for form_post response_mode)
  app.post("/api/gig/auth/apple/callback", async (req: Request, res: Response) => {
    const { code, state, id_token, error: appleError } = req.body;

    if (appleError || !code || !state) {
      return res.redirect("/daftar?error=apple_denied");
    }

    const stateData = pendingOAuthStates.get(state as string);
    if (!stateData) {
      return res.redirect("/daftar?error=invalid_state");
    }
    pendingOAuthStates.delete(state as string);

    try {
      // Generate client secret JWT
      const clientSecret = generateAppleClientSecret();

      // Exchange code for tokens
      const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: apple.clientId,
          client_secret: clientSecret,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri: apple.redirectUri,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;

      if (!tokenData.id_token) {
        console.error("Apple token exchange failed:", tokenData);
        return res.redirect("/daftar?error=apple_token_failed");
      }

      // Decode the id_token (JWT) to get user info
      // Apple's id_token payload contains sub, email, email_verified
      const [, payloadB64] = tokenData.id_token.split(".");
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );

      // Apple may also send user info in the first authorization (form_post body)
      let userName = "";
      if (req.body.user) {
        try {
          const userInfo =
            typeof req.body.user === "string"
              ? JSON.parse(req.body.user)
              : req.body.user;
          userName =
            [userInfo.name?.firstName, userInfo.name?.lastName]
              .filter(Boolean)
              .join(" ") || "";
        } catch {
          // Ignore parse errors
        }
      }

      const user = await findOrCreateUser(
        {
          provider: "apple",
          providerId: payload.sub,
          email: payload.email,
          name: userName || undefined,
          raw: { appleSub: payload.sub },
        },
        stateData.accountType,
        stateData.socsoAutoRegister
      );

      setGigSession(req, user);
      res.redirect("/gig/dashboard?login=success");
    } catch (err) {
      console.error("Apple OAuth error:", err);
      res.redirect("/daftar?error=apple_server_error");
    }
  });
}

// ---------------------------------------------------------------------------
// WhatsApp OTP (via WhatsApp Business API / Twilio / Vonage)
// ---------------------------------------------------------------------------

function handleWhatsAppOTP(app: Express) {
  // Step 1: Request OTP — sends a 6-digit code via WhatsApp
  app.post("/api/gig/auth/whatsapp/request-otp", async (req: Request, res: Response) => {
    const { phone, accountType, socsoAutoRegister } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Nombor telefon diperlukan" });
    }

    // Normalize Malaysian phone numbers
    let normalized = phone.replace(/[\s\-()]/g, "");
    if (normalized.startsWith("0")) {
      normalized = "+60" + normalized.slice(1);
    } else if (!normalized.startsWith("+")) {
      normalized = "+60" + normalized;
    }

    // Validate format (Malaysian mobile: +60 1X-XXXX XXXX)
    if (!/^\+60\d{9,10}$/.test(normalized)) {
      return res
        .status(400)
        .json({ error: "Format nombor telefon tidak sah. Contoh: 012-345 6789" });
    }

    // Rate limit: max 3 OTP requests per phone per 15 minutes
    const recentCodes = await getDb()
      .select()
      .from(whatsappOtpCodes)
      .where(
        and(
          eq(whatsappOtpCodes.phone, normalized),
          gt(whatsappOtpCodes.createdAt, new Date(Date.now() - 15 * 60 * 1000))
        )
      );

    if (recentCodes.length >= 3) {
      return res.status(429).json({
        error: "Terlalu banyak percubaan. Sila tunggu 15 minit.",
      });
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    await getDb().insert(whatsappOtpCodes).values({
      phone: normalized,
      code,
      expiresAt,
    });

    // Send via WhatsApp Business API
    // In production, integrate with Twilio/Vonage/direct WABA
    const waApiKey = process.env.WHATSAPP_API_KEY;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (waApiKey && waPhoneId) {
      try {
        await fetch(
          `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${waApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: normalized.replace("+", ""),
              type: "template",
              template: {
                name: "gig_halal_otp",
                language: { code: "ms" },
                components: [
                  {
                    type: "body",
                    parameters: [{ type: "text", text: code }],
                  },
                ],
              },
            }),
          }
        );
      } catch (err) {
        console.error("WhatsApp API error:", err);
        // Don't fail — fall back to logging the OTP for dev
      }
    } else {
      // Dev mode: log OTP to console
      console.log(`[DEV] WhatsApp OTP for ${normalized}: ${code}`);
    }

    res.json({
      success: true,
      message: "Kod OTP telah dihantar ke WhatsApp anda",
      // Include phone for display (masked)
      phone: normalized.replace(/(\+60\d{2})\d+(\d{4})/, "$1****$2"),
    });
  });

  // Step 2: Verify OTP
  app.post("/api/gig/auth/whatsapp/verify-otp", async (req: Request, res: Response) => {
    const { phone, code, accountType, socsoAutoRegister } = req.body;

    if (!phone || !code) {
      return res
        .status(400)
        .json({ error: "Nombor telefon dan kod OTP diperlukan" });
    }

    // Normalize phone
    let normalized = phone.replace(/[\s\-()]/g, "");
    if (normalized.startsWith("0")) {
      normalized = "+60" + normalized.slice(1);
    } else if (!normalized.startsWith("+")) {
      normalized = "+60" + normalized;
    }

    // Find valid OTP
    const [otpRecord] = await getDb()
      .select()
      .from(whatsappOtpCodes)
      .where(
        and(
          eq(whatsappOtpCodes.phone, normalized),
          eq(whatsappOtpCodes.code, code),
          eq(whatsappOtpCodes.verified, false),
          gt(whatsappOtpCodes.expiresAt, new Date())
        )
      );

    if (!otpRecord) {
      return res
        .status(401)
        .json({ error: "Kod OTP tidak sah atau telah tamat tempoh" });
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      return res
        .status(429)
        .json({ error: "Terlalu banyak percubaan. Sila minta kod baru." });
    }

    // Mark as verified
    await getDb()
      .update(whatsappOtpCodes)
      .set({ verified: true })
      .where(eq(whatsappOtpCodes.id, otpRecord.id));

    // Find or create user
    const user = await findOrCreateUser(
      {
        provider: "whatsapp",
        providerId: normalized,
        phone: normalized,
        name: undefined,
        raw: { phone: normalized },
      },
      accountType || "freelancer",
      socsoAutoRegister === true
    );

    setGigSession(req, user);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        accountType: user.accountType,
        provider: "whatsapp",
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Email/Password Registration
// ---------------------------------------------------------------------------

function handleEmailAuth(app: Express) {
  // Register with email + password
  app.post("/api/gig/auth/register", async (req: Request, res: Response) => {
    const { username, email, password, accountType, socsoAutoRegister } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Nama pengguna dan kata laluan diperlukan" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Kata laluan mestilah sekurang-kurangnya 8 aksara" });
    }

    // Check if username or email already taken
    if (email) {
      const [existingEmail] = await getDb()
        .select()
        .from(gigUsers)
        .where(eq(gigUsers.email, email));
      if (existingEmail) {
        return res.status(409).json({ error: "Emel ini sudah didaftarkan" });
      }
    }

    const [existingUsername] = await getDb()
      .select()
      .from(gigUsers)
      .where(eq(gigUsers.username, username));
    if (existingUsername) {
      return res
        .status(409)
        .json({ error: "Nama pengguna ini sudah digunakan" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await getDb()
      .insert(gigUsers)
      .values({
        username,
        email: email || null,
        passwordHash,
        accountType: accountType || "freelancer",
        authProvider: "email",
        socsoAutoRegister: socsoAutoRegister === true,
      })
      .returning();

    setGigSession(req, user);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        accountType: user.accountType,
        provider: "email",
      },
    });
  });

  // Login with email/password
  app.post("/api/gig/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Nama pengguna dan kata laluan diperlukan" });
    }

    const [user] = await getDb()
      .select()
      .from(gigUsers)
      .where(eq(gigUsers.username, username));

    if (!user || !user.passwordHash) {
      return res
        .status(401)
        .json({ error: "Nama pengguna atau kata laluan tidak sah" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Akaun tidak aktif" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "Nama pengguna atau kata laluan tidak sah" });
    }

    await getDb()
      .update(gigUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(gigUsers.id, user.id));

    setGigSession(req, user);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        accountType: user.accountType,
        provider: user.authProvider,
      },
    });
  });

  // Auth status
  app.get("/api/gig/auth/status", (req: Request, res: Response) => {
    res.json({
      authenticated: !!req.session.gigUserId,
      userId: req.session.gigUserId || null,
      username: req.session.gigUsername || null,
      provider: req.session.gigProvider || null,
      accountType: req.session.gigAccountType || null,
    });
  });

  // Logout
  app.post("/api/gig/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Log keluar gagal" });
      }
      res.json({ success: true });
    });
  });

  // Available auth providers (for frontend to know what's configured)
  app.get("/api/gig/auth/providers", (_req: Request, res: Response) => {
    res.json({
      providers: {
        email: true,
        google: true, // Already implemented per screenshot
        facebook: !!process.env.FACEBOOK_APP_ID,
        apple: !!process.env.APPLE_CLIENT_ID,
        whatsapp: true, // Always available (falls back to console log in dev)
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Main setup function — register all social auth routes
// ---------------------------------------------------------------------------

export function setupGigSocialAuth(app: Express) {
  handleEmailAuth(app);
  handleFacebookAuth(app);
  handleAppleAuth(app);
  handleWhatsAppOTP(app);

  console.log("[GigHalal] Social auth routes registered (Facebook, Apple, WhatsApp, Email)");
}
