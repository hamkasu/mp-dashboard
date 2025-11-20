// Reference: blueprint:javascript_auth_all_persistance
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { hashPassword, comparePasswords } from "./utils/password";
import { authRateLimit, setCsrfToken, auditLog, generateCsrfToken } from "./middleware/security";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "malaysian-parliament-session-secret-replace-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    },
  };

  // Note: trust proxy is now set in server/index.ts before rate limiters
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    try {
      // Validate user object has required id field
      if (!user || typeof user.id !== 'number') {
        const error = new Error('Invalid user object: missing or invalid id');
        console.error('[Auth] serializeUser failed:', { hasUser: !!user, userId: user?.id });
        return done(error);
      }
      done(null, user.id);
    } catch (error) {
      console.error('[Auth] serializeUser unexpected error:', error);
      done(error);
    }
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Fetch user from storage
      const user = await storage.getUser(id);
      
      // User not found - session is stale or user was deleted
      if (!user) {
        console.warn('[Auth] deserializeUser: User not found for session id:', id);
        return done(null, false);
      }
      
      // Successfully deserialized
      done(null, user);
    } catch (error) {
      // Storage/database error - this is a critical infrastructure issue
      console.error('[Auth] deserializeUser storage error:', error);
      // Return error to trigger 500 - this indicates infrastructure problems
      done(error);
    }
  });

  app.post("/api/login", authRateLimit, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        auditLog(req, 'LOGIN', 'user', undefined, false, err.message);
        return next(err);
      }

      if (!user) {
        auditLog(req, 'LOGIN', 'user', undefined, false, 'Invalid credentials');
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) {
          auditLog(req, 'LOGIN', 'user', user.id, false, err.message);
          return next(err);
        }

        auditLog(req, 'LOGIN', 'user', user.id, true);

        // Generate new CSRF token on login
        const csrfToken = generateCsrfToken(req);
        res.cookie('XSRF-TOKEN', csrfToken, {
          httpOnly: false, // Frontend needs to read this for header submission
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        // Token not set in header to minimize XSS exposure

        // Strip password from response for security
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) {
        auditLog(req, 'LOGOUT', 'user', userId, false, err.message);
        return next(err);
      }
      auditLog(req, 'LOGOUT', 'user', userId, true);
      
      // Clear CSRF token on logout
      res.clearCookie('XSRF-TOKEN');
      
      res.sendStatus(200);
    });
  });

  app.get("/api/user", setCsrfToken, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// Middleware to protect routes - only authenticated users can access
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Middleware to protect admin routes - only admin users can access
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  next();
}
