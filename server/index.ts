/**
 * Copyright by Calmic Sdn Bhd
 */

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startHansardCronWithRecovery } from "./hansard-cron";
import { scheduleParliamentaryAnswersSync } from "./parliamentary-answers-cron";
import { startReportCardCron } from "./report-card-cron";
import { trackVisitorAnalytics } from "./analytics-middleware";
import { helmetConfig, readRateLimit } from "./middleware/security";
import { corsConfig } from "./middleware/cors";
import { responseSizeLimiter } from "./middleware/response-limiter";
import { memoryMonitor, startMemoryLogging, getMemoryStatus } from "./middleware/memory-monitor";
import { setupAuth } from "./simple-auth";
import { runStartupTasks } from "./startup-tasks";
import { isDatabaseAvailable } from "./db";

// Validate DATABASE_URL is set at runtime (not during build)
if (!isDatabaseAvailable()) {
  console.error("DATABASE_URL must be set. Did you forget to provision the database?");
  process.exit(1);
}

const app = express();
const server = createServer(app);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Trust proxy - MUST be before rate limiters to correctly identify client IPs
// Railway/Replit use reverse proxies that set X-Forwarded-For headers
app.set("trust proxy", 1);

// Health check endpoint - must be early in middleware chain to respond
// even if other parts of the app haven't fully initialized
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Memory status endpoint for monitoring
app.get("/api/memory-status", (_req, res) => {
  const memoryStatus = getMemoryStatus();
  const statusCode = memoryStatus.status === 'danger' ? 503 : 200;
  res.status(statusCode).json(memoryStatus);
});

// CORS - handles static assets separately and validates API requests
app.use(corsConfig);

// Security headers
app.use(helmetConfig);

// Gzip compression to reduce bandwidth costs on Railway
// Compress all responses > 1KB (default threshold)
app.use(compression({
  level: 6, // Balanced compression level (0-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter default
    return compression.filter(req, res);
  }
}));

// Global rate limiting for all requests
app.use(readRateLimit);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Response size limiter to prevent costly large responses
app.use(responseSizeLimiter);

// Memory monitoring for Railway (prevents OOM crashes)
app.use(memoryMonitor);

// Track visitor analytics
app.use(trackVisitorAnalytics());

// Setup authentication (session, auth routes)
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
      // In production, only log slow requests (>1s) or errors to reduce I/O costs
      const isProduction = process.env.NODE_ENV === 'production';
      const isSlow = duration > 1000;
      const isError = res.statusCode >= 400;

      if (!isProduction || isSlow || isError) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

        // Only include response body in non-production or for errors
        if (!isProduction && capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

// Serve static files from attached_assets (for PDFs and other uploads)
// Cache PDFs and uploads for 1 week since they rarely change
app.use('/attached_assets', express.static('attached_assets', {
  maxAge: '7d', // Cache for 1 week
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // PDFs and documents can be cached for a week
    if (path.endsWith('.pdf') || path.endsWith('.doc') || path.endsWith('.docx')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
    // Images in uploads can be cached longer
    else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    }
  }
}));

// Start listening IMMEDIATELY so health checks pass while routes are being registered
// This is critical for Railway deployment - health checks start as soon as the process runs
const port = parseInt(process.env.PORT || '5000', 10);
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`Server listening on port ${port}`);
});

(async () => {
  // Run startup tasks (db:push, migrations, data imports) in production
  // This runs after the server is listening so health checks pass immediately
  if (process.env.NODE_ENV === "production") {
    await runStartupTasks();
  }

  await registerRoutes(app, server);

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

  log(`App fully initialized`);

  // Start the daily Hansard sync cron job with startup recovery
  await startHansardCronWithRecovery();

  // Start the daily Parliamentary Answers sync cron job
  scheduleParliamentaryAnswersSync();

  // Start the monthly Report Card update cron job
  startReportCardCron();

  // Start memory monitoring (log every 10 minutes in production)
  if (process.env.NODE_ENV === "production") {
    startMemoryLogging(10);
  }
})();
