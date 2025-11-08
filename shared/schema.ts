import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const courtCases = pgTable("court_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").notNull(),
  title: text("title").notNull(),
  courtLevel: text("court_level").notNull(),
  status: text("status").notNull(),
  filingDate: timestamp("filing_date").notNull(),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'`),
});

export const insertCourtCaseSchema = createInsertSchema(courtCases).omit({
  id: true,
}).extend({
  documentLinks: z.array(z.string()).default([]),
});

export type InsertCourtCase = z.infer<typeof insertCourtCaseSchema>;
export type CourtCase = typeof courtCases.$inferSelect;

export const sprmInvestigations = pgTable("sprm_investigations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number"),
  title: text("title").notNull(),
  status: text("status").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'`),
});

export const insertSprmInvestigationSchema = createInsertSchema(sprmInvestigations).omit({
  id: true,
}).extend({
  documentLinks: z.array(z.string()).default([]),
});

export const updateSprmInvestigationSchema = insertSprmInvestigationSchema.omit({ mpId: true }).partial();

export type InsertSprmInvestigation = z.infer<typeof insertSprmInvestigationSchema>;
export type UpdateSprmInvestigation = z.infer<typeof updateSprmInvestigationSchema>;
export type SprmInvestigation = typeof sprmInvestigations.$inferSelect;

export const legislativeProposals = pgTable("legislative_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  dateProposed: timestamp("date_proposed").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  hansardReference: text("hansard_reference"),
  outcome: text("outcome"),
});

export const insertLegislativeProposalSchema = createInsertSchema(legislativeProposals).omit({
  id: true,
});

export type InsertLegislativeProposal = z.infer<typeof insertLegislativeProposalSchema>;
export type LegislativeProposal = typeof legislativeProposals.$inferSelect;

export const debateParticipations = pgTable("debate_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  topic: text("topic").notNull(),
  date: timestamp("date").notNull(),
  contribution: text("contribution").notNull(),
  hansardReference: text("hansard_reference"),
  position: text("position"),
});

export const insertDebateParticipationSchema = createInsertSchema(debateParticipations).omit({
  id: true,
});

export type InsertDebateParticipation = z.infer<typeof insertDebateParticipationSchema>;
export type DebateParticipation = typeof debateParticipations.$inferSelect;

export const parliamentaryQuestions = pgTable("parliamentary_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  questionText: text("question_text").notNull(),
  dateAsked: timestamp("date_asked").notNull(),
  ministry: text("ministry").notNull(),
  topic: text("topic").notNull(),
  answerStatus: text("answer_status").notNull(),
  hansardReference: text("hansard_reference"),
  answerText: text("answer_text"),
});

export const insertParliamentaryQuestionSchema = createInsertSchema(parliamentaryQuestions).omit({
  id: true,
});

export type InsertParliamentaryQuestion = z.infer<typeof insertParliamentaryQuestionSchema>;
export type ParliamentaryQuestion = typeof parliamentaryQuestions.$inferSelect;
