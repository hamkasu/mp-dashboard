/**
 * Copyright by Calmic Sdn Bhd
 */

import * as schema from "@shared/schema";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import pg from "pg";

// Configure pg to parse JSONB as JSON automatically
pg.types.setTypeParser(3802, (val) => JSON.parse(val)); // JSONB type OID = 3802
pg.types.setTypeParser(114, (val) => JSON.parse(val));  // JSON type OID = 114

// Allow optional database connection for build-time scenarios (like prerendering)
// where DATABASE_URL may not be available
let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

if (process.env.DATABASE_URL) {
  // Use standard PostgreSQL driver (compatible with Railway, Heroku, etc.)
  // Connection pool configuration for cost optimization
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    // Connection pool limits to prevent excessive connections (Railway cost optimization)
    max: 20, // Maximum number of clients in the pool
    min: 2, // Minimum number of clients to keep in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error if connection takes > 10s
    // Allow the pool to gracefully handle disconnections
    allowExitOnIdle: false,
  });
  db = drizzle({ client: pool, schema });

  // Log pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
  });
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
