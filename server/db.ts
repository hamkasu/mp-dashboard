import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision the database?");
}

// Use Neon HTTP driver for both local and cloud databases
// The neon() function works with both PostgreSQL connection strings
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });
