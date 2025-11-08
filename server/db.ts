import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision the database?");
}

// Configure WebSocket for Node.js environment (required for neon-serverless)
neonConfig.webSocketConstructor = ws;

// Use Neon WebSocket driver for full transaction and .returning() support
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
