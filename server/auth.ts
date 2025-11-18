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

  app.set("trust proxy", 1);
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

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", authRateLimit, async (req, res, next) => {
    try {
      // Validate request body against schema
      const validatedData = insertUserSchema.parse(req.body) as { username: string; password: string };
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        auditLog(req, 'REGISTER', 'user', validatedData.username, false, 'Username already exists');
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        username: validatedData.username,
        password: await hashPassword(validatedData.password),
      });

      req.login(user, (err) => {
        if (err) {
          auditLog(req, 'REGISTER', 'user', user.id, false, err.message);
          return next(err);
        }
        auditLog(req, 'REGISTER', 'user', user.id, true);
        
        // Generate new CSRF token on registration
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
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      auditLog(req, 'REGISTER', 'user', undefined, false, error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid input data", details: error });
      }
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", authRateLimit, passport.authenticate("local"), (req, res) => {
    auditLog(req, 'LOGIN', 'user', req.user?.id, true);
    
    // Generate new CSRF token on login
    const csrfToken = generateCsrfToken(req);
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // Frontend needs to read this for header submission
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    // Token not set in header to minimize XSS exposure
    
    res.status(200).json(req.user);
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
