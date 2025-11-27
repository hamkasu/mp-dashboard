/**
 * Copyright by Calmic Sdn Bhd
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { shouldServePrerendered, normalizePathForPrerender } from "./bot-detector";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamically import vite only in development to avoid bundling it in production
  const viteModule = await import("vite");
  const createViteServer = viteModule.createServer;
  const createLogger = viteModule.createLogger;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Load vite config dynamically to avoid bundling vite dependencies in production
  // We use configFile: true to let vite load its config file directly
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

let urlMapCache: Record<string, string> | null = null;

function loadUrlMap(prerenderedPath: string): Record<string, string> {
  if (urlMapCache) {
    return urlMapCache;
  }
  
  const urlMapPath = path.join(prerenderedPath, 'url-map.json');
  if (fs.existsSync(urlMapPath)) {
    try {
      const content = fs.readFileSync(urlMapPath, 'utf-8');
      urlMapCache = JSON.parse(content);
      return urlMapCache as Record<string, string>;
    } catch (error) {
      log(`Warning: Failed to load URL map: ${error}`);
    }
  }
  
  return {};
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const prerenderedPath = path.resolve(import.meta.dirname, "..", "dist", "prerendered");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Aggressive caching for static assets to reduce bandwidth costs
  app.use(express.static(distPath, {
    maxAge: '1y', // Cache for 1 year (static assets have hashed filenames)
    immutable: true, // Tell browsers this file will never change
    etag: true, // Enable ETags for validation
    lastModified: true, // Enable Last-Modified header
    setHeaders: (res, path) => {
      // Cache JS, CSS, fonts, images aggressively (1 year)
      if (path.endsWith('.js') || path.endsWith('.css') ||
          path.endsWith('.woff') || path.endsWith('.woff2') ||
          path.endsWith('.ttf') || path.endsWith('.eot') ||
          path.endsWith('.png') || path.endsWith('.jpg') ||
          path.endsWith('.jpeg') || path.endsWith('.gif') ||
          path.endsWith('.svg') || path.endsWith('.webp') ||
          path.endsWith('.ico')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Cache HTML for shorter time (1 hour) to allow updates
      else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
    }
  }));
  
  app.get("/sitemap.xml", (_req, res) => {
    const sitemapPath = path.join(distPath, "sitemap.xml");
    if (fs.existsSync(sitemapPath)) {
      res.sendFile(sitemapPath);
    } else {
      res.status(404).send("Sitemap not found");
    }
  });
  
  app.get("/robots.txt", (_req, res) => {
    const robotsPath = path.join(distPath, "robots.txt");
    if (fs.existsSync(robotsPath)) {
      res.sendFile(robotsPath);
    } else {
      res.status(404).send("robots.txt not found");
    }
  });

  app.use("*", (req, res) => {
    if (shouldServePrerendered(req) && fs.existsSync(prerenderedPath)) {
      const normalizedPath = normalizePathForPrerender(req.path);
      const urlMap = loadUrlMap(prerenderedPath);
      const filename = urlMap[normalizedPath];
      
      if (filename) {
        const htmlPath = path.join(prerenderedPath, filename);
        if (fs.existsSync(htmlPath)) {
          log(`🤖 Serving pre-rendered page to bot: ${req.path} -> ${filename}`);
          return res.sendFile(htmlPath);
        }
      }
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
