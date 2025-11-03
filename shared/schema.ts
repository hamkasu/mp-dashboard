import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mps = pgTable("mps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  party: text("party").notNull(),
  parliamentCode: text("parliament_code").notNull(),
  constituency: text("constituency").notNull(),
  state: text("state").notNull(),
  gender: text("gender").notNull(),
  title: text("title"),
  role: text("role"),
  swornInDate: timestamp("sworn_in_date").notNull(),
  mpAllowance: integer("mp_allowance").notNull(),
  ministerSalary: integer("minister_salary").notNull().default(0),
  daysAttended: integer("days_attended").notNull().default(0),
  totalParliamentDays: integer("total_parliament_days").notNull().default(0),
  entertainmentAllowance: integer("entertainment_allowance").notNull().default(2500),
  handphoneAllowance: integer("handphone_allowance").notNull().default(2000),
  computerAllowance: integer("computer_allowance").notNull().default(6000),
  dressWearAllowance: integer("dress_wear_allowance").notNull().default(1000),
  parliamentSittingAllowance: integer("parliament_sitting_allowance").notNull().default(400),
});

export const insertMpSchema = createInsertSchema(mps).omit({
  id: true,
});

export type InsertMp = z.infer<typeof insertMpSchema>;
export type Mp = typeof mps.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
