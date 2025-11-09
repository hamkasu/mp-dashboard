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
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
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
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
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

export interface HansardSpeaker {
  mpId: string;
  mpName: string;
  speakingOrder: number;
  duration?: number;
}

export interface HansardVoteRecord {
  voteType: string;
  motion: string;
  result: string;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  timestamp?: string;
}

export const hansardRecords = pgTable("hansard_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionNumber: text("session_number").notNull(),
  sessionDate: timestamp("session_date").notNull(),
  parliamentTerm: text("parliament_term").notNull(),
  sitting: text("sitting").notNull(),
  transcript: text("transcript").notNull(),
  summary: text("summary"),
  summaryLanguage: text("summary_language").default("en"),
  summarizedAt: timestamp("summarized_at"),
  pdfLinks: jsonb("pdf_links").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  topics: jsonb("topics").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  speakers: jsonb("speakers").$type<HansardSpeaker[]>().notNull().default(sql`'[]'::jsonb`),
  voteRecords: jsonb("vote_records").$type<HansardVoteRecord[]>().notNull().default(sql`'[]'::jsonb`),
  attendedMpIds: jsonb("attended_mp_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  absentMpIds: jsonb("absent_mp_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertHansardRecordSchema = createInsertSchema(hansardRecords).omit({
  id: true,
  createdAt: true,
  summarizedAt: true,
}).extend({
  sessionDate: z.coerce.date(),
  summary: z.string().nullable().optional(),
  summaryLanguage: z.string().nullable().optional(),
  pdfLinks: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  speakers: z.array(z.object({
    mpId: z.string(),
    mpName: z.string(),
    speakingOrder: z.number(),
    duration: z.number().optional(),
  })).default([]),
  voteRecords: z.array(z.object({
    voteType: z.string(),
    motion: z.string(),
    result: z.string(),
    yesCount: z.number(),
    noCount: z.number(),
    abstainCount: z.number(),
    timestamp: z.string().optional(),
  })).default([]),
  attendedMpIds: z.array(z.string()).default([]),
  absentMpIds: z.array(z.string()).default([]),
});

export const updateHansardRecordSchema = insertHansardRecordSchema.partial();

export type InsertHansardRecord = z.infer<typeof insertHansardRecordSchema>;
export type UpdateHansardRecord = z.infer<typeof updateHansardRecordSchema>;
export type HansardRecord = typeof hansardRecords.$inferSelect;

export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: text("page").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  lastViewed: timestamp("last_viewed").notNull().default(sql`NOW()`),
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  lastViewed: true,
});

export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;
