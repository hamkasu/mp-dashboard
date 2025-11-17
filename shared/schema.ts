import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  },
});

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
  termEndDate: timestamp("term_end_date"),
  mpAllowance: integer("mp_allowance").notNull(),
  ministerSalary: integer("minister_salary").notNull().default(0),
  daysAttended: integer("days_attended").notNull().default(0),
  totalParliamentDays: integer("total_parliament_days").notNull().default(0),
  hansardSessionsSpoke: integer("hansard_sessions_spoke").notNull().default(0),
  totalSpeechInstances: integer("total_speech_instances").notNull().default(0),
  entertainmentAllowance: integer("entertainment_allowance").notNull().default(2500),
  handphoneAllowance: integer("handphone_allowance").notNull().default(2000),
  computerAllowance: integer("computer_allowance").notNull().default(6000),
  dressWearAllowance: integer("dress_wear_allowance").notNull().default(1000),
  parliamentSittingAllowance: integer("parliament_sitting_allowance").notNull().default(400),
  governmentMeetingDays: integer("government_meeting_days").notNull().default(0),
  isMinister: boolean("is_minister").notNull().default(false),
  ministerialPosition: text("ministerial_position"),
});

export const insertMpSchema = createInsertSchema(mps).omit({
  id: true,
});

export type InsertMp = z.infer<typeof insertMpSchema>;
export type Mp = typeof mps.$inferSelect;

export const courtCases = pgTable("court_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").notNull().unique(),
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
  caseNumber: text("case_number").unique(),
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
  billNumber: text("bill_number"),
  coSponsors: jsonb("co_sponsors").$type<string[]>().default(sql`'[]'::jsonb`),
  hansardRecordId: varchar("hansard_record_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertLegislativeProposalSchema = createInsertSchema(legislativeProposals).omit({
  id: true,
  createdAt: true,
}).extend({
  coSponsors: z.array(z.string()).default([]).optional(),
  hansardRecordId: z.string().nullable().optional(),
  billNumber: z.string().nullable().optional(),
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
  questionType: text("question_type"),
  questionNumber: text("question_number"),
  hansardRecordId: varchar("hansard_record_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertParliamentaryQuestionSchema = createInsertSchema(parliamentaryQuestions).omit({
  id: true,
  createdAt: true,
}).extend({
  questionType: z.string().nullable().optional(),
  questionNumber: z.string().nullable().optional(),
  hansardRecordId: z.string().nullable().optional(),
});

export type InsertParliamentaryQuestion = z.infer<typeof insertParliamentaryQuestionSchema>;
export type ParliamentaryQuestion = typeof parliamentaryQuestions.$inferSelect;

// Hansard Speaking Instance type for speech analysis
export interface HansardSpeakingInstance {
  mpId: string;
  mpName: string;
  instanceNumber: number;
  lineNumber: number;
  charOffsetStart?: number;
}

export interface HansardSpeaker {
  mpId: string;
  mpName: string;
  speakingOrder: number;
  duration?: number;
  totalSpeeches?: number;
}

export interface HansardSpeakerStats {
  mpId: string;
  mpName: string;
  totalSpeeches: number;
  speakingOrder: number | null;
}

export interface SessionSpeakerStats {
  totalUniqueSpeakers: number;
  speakingMpIds: string[];
  speakingConstituencies: string[];
  constituenciesAttended: number;
  constituenciesSpoke: number;
  constituenciesAttendedButSilent: string[];
  attendanceRate: number;
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
  speakerStats: jsonb("speaker_stats").$type<HansardSpeakerStats[]>().notNull().default(sql`'[]'::jsonb`),
  sessionSpeakerStats: jsonb("session_speaker_stats").$type<SessionSpeakerStats | null>().default(null),
  voteRecords: jsonb("vote_records").$type<HansardVoteRecord[]>().notNull().default(sql`'[]'::jsonb`),
  attendedMpIds: jsonb("attended_mp_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  absentMpIds: jsonb("absent_mp_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  constituenciesPresent: integer("constituencies_present"),
  constituenciesAbsent: integer("constituencies_absent"),
  constituenciesAbsentRule91: integer("constituencies_absent_rule91"),
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
    totalSpeeches: z.number().optional(),
  })).default([]),
  speakerStats: z.array(z.object({
    mpId: z.string(),
    mpName: z.string(),
    totalSpeeches: z.number(),
    speakingOrder: z.number().nullable(),
  })).optional().default([]),
  sessionSpeakerStats: z.object({
    totalUniqueSpeakers: z.number(),
    speakingMpIds: z.array(z.string()),
    speakingConstituencies: z.array(z.string()),
    constituenciesAttended: z.number(),
    constituenciesSpoke: z.number(),
    constituenciesAttendedButSilent: z.array(z.string()),
    attendanceRate: z.number(),
  }).nullable().optional(),
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
  constituenciesPresent: z.number().nullable().optional(),
  constituenciesAbsent: z.number().nullable().optional(),
  constituenciesAbsentRule91: z.number().nullable().optional(),
});

export const updateHansardRecordSchema = insertHansardRecordSchema.partial();

export type InsertHansardRecord = z.infer<typeof insertHansardRecordSchema>;
export type UpdateHansardRecord = z.infer<typeof updateHansardRecordSchema>;
export type HansardRecord = typeof hansardRecords.$inferSelect;

export const hansardPdfFiles = pgTable("hansard_pdf_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  contentType: text("content_type").notNull().default("application/pdf"),
  pdfData: bytea("pdf_data").notNull(),
  md5Hash: text("md5_hash"),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`NOW()`),
  uploadedBy: varchar("uploaded_by"),
  isPrimary: boolean("is_primary").notNull().default(true),
});

export const insertHansardPdfFileSchema = createInsertSchema(hansardPdfFiles).omit({
  id: true,
  uploadedAt: true,
}).extend({
  pdfData: z.any(), // Buffer type - validated on server only
  md5Hash: z.string().optional(),
  uploadedBy: z.string().optional(),
  isPrimary: z.boolean().optional().default(true),
});

export type InsertHansardPdfFile = z.infer<typeof insertHansardPdfFileSchema>;
export type HansardPdfFile = typeof hansardPdfFiles.$inferSelect;

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

export const unmatchedSpeakers = pgTable("unmatched_speakers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  extractedName: text("extracted_name").notNull(),
  extractedConstituency: text("extracted_constituency"),
  matchFailureReason: text("match_failure_reason").notNull(),
  speakingOrder: integer("speaking_order"),
  rawHeaderText: text("raw_header_text"),
  suggestedMpIds: jsonb("suggested_mp_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  isMapped: boolean("is_mapped").notNull().default(false),
  mappedMpId: varchar("mapped_mp_id").references(() => mps.id),
  mappedAt: timestamp("mapped_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertUnmatchedSpeakerSchema = createInsertSchema(unmatchedSpeakers).omit({
  id: true,
  createdAt: true,
  mappedAt: true,
}).extend({
  extractedConstituency: z.string().nullable().optional(),
  speakingOrder: z.number().nullable().optional(),
  rawHeaderText: z.string().nullable().optional(),
  suggestedMpIds: z.array(z.string()).optional().default([]),
  isMapped: z.boolean().optional().default(false),
  mappedMpId: z.string().nullable().optional(),
});

export type InsertUnmatchedSpeaker = z.infer<typeof insertUnmatchedSpeakerSchema>;
export type UnmatchedSpeaker = typeof unmatchedSpeakers.$inferSelect;

export const speakerMappings = pgTable("speaker_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unmatchedSpeakerId: varchar("unmatched_speaker_id").notNull().references(() => unmatchedSpeakers.id, { onDelete: "cascade" }),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  mappingType: text("mapping_type").notNull(),
  confidence: integer("confidence"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertSpeakerMappingSchema = createInsertSchema(speakerMappings).omit({
  id: true,
  createdAt: true,
}).extend({
  confidence: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
});

export type InsertSpeakerMapping = z.infer<typeof insertSpeakerMappingSchema>;
export type SpeakerMapping = typeof speakerMappings.$inferSelect;
