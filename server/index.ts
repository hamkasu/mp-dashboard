import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startHansardCron } from "./hansard-cron";
import { trackVisitorAnalytics } from "./analytics-middleware";
import { helmetConfig, readRateLimit } from "./middleware/security";
import { corsConfig } from "./middleware/cors";
import { setupAuth } from "./simple-auth";
import { runStartupTasks } from "./startup-tasks";

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

// CORS - must be before other middleware to handle preflight requests
app.use(corsConfig);

// Security headers
app.use(helmetConfig);

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

  // Start the daily Hansard sync cron job
  startHansardCron();
})();
