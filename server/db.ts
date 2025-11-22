/**
 * Copyright by Calmic Sdn Bhd
 */

import * as schema from "@shared/schema";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Allow optional database connection for build-time scenarios (like prerendering)
// where DATABASE_URL may not be available
let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

if (process.env.DATABASE_URL) {
  // Use standard PostgreSQL driver (compatible with Railway, Heroku, etc.)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
  db = drizzle({ client: pool, schema });
}

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null;
}

// Helper to get the database connection, throws if not available
export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision the database?");
  }
  return db;
}

export { pool, db };
