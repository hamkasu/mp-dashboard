import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./storage";
import { startHansardCron } from "./hansard-cron";
import { trackVisitorAnalytics } from "./analytics-middleware";
import { helmetConfig, readRateLimit } from "./middleware/security";
import { corsConfig } from "./middleware/cors";
import cookieParser from "cookie-parser";
import { setupAuth } from "./auth";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Trust proxy - MUST be before rate limiters to correctly identify client IPs
// Railway/Replit use reverse proxies that set X-Forwarded-For headers
app.set("trust proxy", 1);

// CORS - must be before other middleware to handle preflight requests
app.use(corsConfig);

// Security headers
app.use(helmetConfig);

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Global rate limiting for all requests
app.use(readRateLimit);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Track visitor analytics
app.use(trackVisitorAnalytics());

// Setup authentication (session, passport, auth routes)
setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Serve static files from attached_assets (for PDFs and other uploads)
app.use('/attached_assets', express.static('attached_assets'));

(async () => {
  // Seed database before starting server (only if using DbStorage)
  // Creates admin user if it doesn't exist
  if (process.env.DATABASE_URL) {
    try {
      log("Starting database seeding...");
      log("ADMIN_USERNAME:", process.env.ADMIN_USERNAME ? "SET" : "NOT SET");
      log("ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "SET" : "NOT SET");
      await seedDatabase();
      log("Database seeded successfully");
    } catch (error) {
      log("ERROR: Database seeding failed:", String(error));
      console.error("Full error:", error);
    }
  } else {
    log("WARNING: DATABASE_URL not set, skipping database seeding");
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error('[Error Handler]', {
      status,
      message,
      stack: err.stack,
      path: _req.path,
      method: _req.method
    });

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the daily Hansard sync cron job
    startHansardCron();
  });
})();
