/**
 * Copyright by Calmic Sdn Bhd
 */

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
  isDeputyMinister: boolean("is_deputy_minister").notNull().default(false),
  ministerialPosition: text("ministerial_position"),
  contactAddress: text("contact_address"),
  email: text("email"),
  telephone: text("telephone"),
  fax: text("fax"),
  mobileNumber: text("mobile_number"),
  socialMedia: text("social_media"),
  serviceAddress: text("service_address"),
  // Individual social media profiles
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  tiktokUrl: text("tiktok_url"),
  // By-election tracking
  byElectionDate: timestamp("by_election_date"),
  byElectionNotes: text("by_election_notes"),
  // Election results tracking
  electionVotesReceived: integer("election_votes_received"),
  electionTotalValidVotes: integer("election_total_valid_votes"),
  electionYear: integer("election_year").default(2022),
  electionMajority: integer("election_majority"),
  electionTurnoutPercent: integer("election_turnout_percent"), // percentage * 100 (e.g. 7652 = 76.52%)
  electionVotePercentage: integer("election_vote_percentage"), // percentage * 100 (e.g. 5358 = 53.58%)
  // MYMP.org.my Biography Integration
  // Data sourced manually from https://mymp.org.my (volunteer-run MP directory)
  mympSlug: text("mymp_slug"), // URL slug for MYMP profile (e.g., "syed-saddiq")
  mympUrl: text("mymp_url"), // Full MYMP profile URL
  bioSummary: text("bio_summary"), // Biography summary from MYMP
  birthDate: timestamp("birth_date"), // Date of birth
  hometown: text("hometown"), // Place of origin/hometown
  education: jsonb("education").$type<string[]>().default(sql`'[]'::jsonb`), // Education history
  politicalHistory: jsonb("political_history").$type<Array<{ party: string; startYear: number; endYear?: number; notes?: string }>>().default(sql`'[]'::jsonb`), // Political journey
  nonPoliticalAffiliations: jsonb("non_political_affiliations").$type<string[]>().default(sql`'[]'::jsonb`), // NGOs, associations
  careerHistory: jsonb("career_history").$type<string[]>().default(sql`'[]'::jsonb`), // Career before politics
  mympLoyaltyScore: integer("mymp_loyalty_score"), // Optional: MYMP loyalty score (0-10 scaled to 0-100)
  mympAvailabilityScore: integer("mymp_availability_score"), // Optional: MYMP availability score
  mympEthicsScore: integer("mymp_ethics_score"), // Optional: MYMP ethics score
  wikipediaUrl: text("wikipedia_url"), // Wikipedia link if available
  mympDataUpdatedAt: timestamp("mymp_data_updated_at"), // When MYMP data was last synced
  // Phase 4: Coalition-based percentile scoring
  coalitionId: varchar("coalition_id").references(() => coalitions.id, { onDelete: "set null" }),
});

export const insertMpSchema = createInsertSchema(mps).omit({
  id: true,
});

export type InsertMp = z.infer<typeof insertMpSchema>;
export type Mp = typeof mps.$inferSelect;

// ========== COALITIONS ==========
// Phase 4: Political coalition groupings for relative percentile scoring

export const coalitions = pgTable("coalitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),  // "Barisan Nasional", "Pakatan Harapan", etc.
  code: text("code").notNull().unique(),  // "BN", "PH", "GPS", "PN", "IND"
  colorHex: text("color_hex"),            // UI color for coalition (e.g., "#FF0000")
  description: text("description"),       // Coalition description/notes
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertCoalitionSchema = createInsertSchema(coalitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  colorHex: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const updateCoalitionSchema = insertCoalitionSchema.partial();

export type InsertCoalition = z.infer<typeof insertCoalitionSchema>;
export type UpdateCoalition = z.infer<typeof updateCoalitionSchema>;
export type Coalition = typeof coalitions.$inferSelect;

// Party to Coalition mapping table
export const partyCoalitionMappings = pgTable("party_coalition_mapping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partyName: text("party_name").notNull(),
  coalitionId: varchar("coalition_id").notNull().references(() => coalitions.id, { onDelete: "cascade" }),
  effectiveDate: timestamp("effective_date").notNull().default(sql`NOW()`),
  endDate: timestamp("end_date"),         // null = still in coalition
  notes: text("notes"),
});

export type PartyCoalitionMapping = typeof partyCoalitionMappings.$inferSelect;

// Sarawak State Legislative Assembly (DUN) Members
export const sarawakDunMembers = pgTable("sarawak_dun_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  constituency: text("constituency").notNull(),
  constituencyNumber: text("constituency_number").notNull(),
  party: text("party").notNull(),
  photoUrl: text("photo_url"),
  profileUrl: text("profile_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertSarawakDunMemberSchema = createInsertSchema(sarawakDunMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSarawakDunMember = z.infer<typeof insertSarawakDunMemberSchema>;
export type SarawakDunMember = typeof sarawakDunMembers.$inferSelect;

// Case status enum - aligned with Phase 2 spec
export const CASE_STATUS_VALUES = ["under_investigation", "charged", "convicted", "acquitted", "withdrawn", "appeal_pending"] as const;
export type CaseStatus = typeof CASE_STATUS_VALUES[number];

export const courtCases = pgTable("court_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").notNull().unique(),
  title: text("title").notNull(),
  courtLevel: text("court_level").notNull(),
  status: text("status").$type<CaseStatus>().notNull(),
  caseType: text("case_type").notNull().default("criminal"),
  filingDate: timestamp("filing_date").notNull(),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  statusConfirmedAt: timestamp("status_confirmed_at"), // When status was last verified against public record
  statusConfirmedBy: varchar("status_confirmed_by"), // Who verified it (admin user ID)
  statusNotes: text("status_notes"), // Any caveats/flags about the status determination
});

export const insertCourtCaseSchema = createInsertSchema(courtCases).omit({
  id: true,
  statusConfirmedAt: true,
}).extend({
  status: z.enum(CASE_STATUS_VALUES),
  documentLinks: z.array(z.string()).default([]),
  filingDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date()
  ),
  statusConfirmedBy: z.string().nullable().optional(),
  statusNotes: z.string().nullable().optional(),
});

export const updateCourtCaseSchema = insertCourtCaseSchema.partial();

export type InsertCourtCase = z.infer<typeof insertCourtCaseSchema>;
export type UpdateCourtCase = z.infer<typeof updateCourtCaseSchema>;
export type CourtCase = typeof courtCases.$inferSelect;

export const sprmInvestigations = pgTable("sprm_investigations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").unique(),
  title: text("title").notNull(),
  status: text("status").$type<CaseStatus>().notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  statusConfirmedAt: timestamp("status_confirmed_at"),
  statusConfirmedBy: varchar("status_confirmed_by"),
  statusNotes: text("status_notes"),
});

export const insertSprmInvestigationSchema = createInsertSchema(sprmInvestigations).omit({
  id: true,
  statusConfirmedAt: true,
}).extend({
  status: z.enum(CASE_STATUS_VALUES),
  documentLinks: z.array(z.string()).default([]),
  startDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date()
  ),
  endDate: z.preprocess(
    (val) => (val === null || val === undefined || val === '' ? null : typeof val === 'string' ? new Date(val) : val),
    z.date().nullable().optional()
  ),
  statusConfirmedBy: z.string().nullable().optional(),
  statusNotes: z.string().nullable().optional(),
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
  senatorsAttending: jsonb("senators_attending").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
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
  senatorsAttending: z.array(z.string()).default([]),
  constituenciesPresent: z.number().nullable().optional(),
  constituenciesAbsent: z.number().nullable().optional(),
  constituenciesAbsentRule91: z.number().nullable().optional(),
});

export const updateHansardRecordSchema = insertHansardRecordSchema.partial();

export type InsertHansardRecord = z.infer<typeof insertHansardRecordSchema>;
export type UpdateHansardRecord = z.infer<typeof updateHansardRecordSchema>;
export type HansardRecord = typeof hansardRecords.$inferSelect;

// Extended type for Hansard records with PDF availability status (computed at runtime)
export type HansardRecordWithPdf = HansardRecord & {
  hasPdf: boolean;
};

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

// User Activity Log table for tracking page visits
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"),
  pageUrl: text("page_url").notNull(),
  pageName: text("page_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().default(sql`NOW()`),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  timestamp: true,
});

export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;

// Visitor Analytics table for tracking all page visits with geolocation
export const visitorAnalytics = pgTable("visitor_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: text("path").notNull(),
  ip: text("ip"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  timezone: text("timezone"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  timestamp: timestamp("timestamp").notNull().default(sql`NOW()`),
});

export const insertVisitorAnalyticsSchema = createInsertSchema(visitorAnalytics).omit({
  id: true,
  timestamp: true,
});

export type InsertVisitorAnalytics = z.infer<typeof insertVisitorAnalyticsSchema>;
export type VisitorAnalytics = typeof visitorAnalytics.$inferSelect;

// Admin Users table for multi-user authentication
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  email: z.string().email().optional(),
  isActive: z.boolean().optional().default(true),
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Constituencies table for parliamentary constituency data
export const constituencies = pgTable("constituencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull(),
  parliamentCode: text("parliament_code").notNull().unique(),
  name: text("name").notNull(),
  povertyIncidence: integer("poverty_incidence"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertConstituencySchema = createInsertSchema(constituencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConstituency = z.infer<typeof insertConstituencySchema>;
export type Constituency = typeof constituencies.$inferSelect;

// Blog Posts table for articles and news
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  author: text("author").notNull(),
  readTime: integer("read_time").notNull(), // in minutes
  publishedAt: timestamp("published_at").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url"),
  views: integer("views").notNull().default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  readTime: z.number().min(1).max(60),
  isPublished: z.boolean().optional().default(false),
  imageUrl: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  publishedAt: z.coerce.date(),
});

export const updateBlogPostSchema = insertBlogPostSchema.partial();

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type UpdateBlogPost = z.infer<typeof updateBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// AI Analysis tables
export const hansardTopicAnalysis = pgTable("hansard_topic_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  topics: jsonb("topics").$type<Array<{ topic: string; relevance: number; keywords: string[] }>>().notNull(),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardTopicAnalysisSchema = createInsertSchema(hansardTopicAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardTopicAnalysis = z.infer<typeof insertHansardTopicAnalysisSchema>;
export type HansardTopicAnalysis = typeof hansardTopicAnalysis.$inferSelect;

export const hansardSentimentAnalysis = pgTable("hansard_sentiment_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  overallSentiment: text("overall_sentiment").notNull(),
  sentimentScore: integer("sentiment_score").notNull(),
  confidence: integer("confidence").notNull(),
  keyPoints: jsonb("key_points").$type<Array<{ point: string; sentiment: string }>>().notNull(),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardSentimentAnalysisSchema = createInsertSchema(hansardSentimentAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardSentimentAnalysis = z.infer<typeof insertHansardSentimentAnalysisSchema>;
export type HansardSentimentAnalysis = typeof hansardSentimentAnalysis.$inferSelect;

export const hansardSpeakerAnalysis = pgTable("hansard_speaker_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  speakerInsights: jsonb("speaker_insights").$type<Array<{ 
    mpId: string; 
    mpName: string; 
    topicsDiscussed: string[]; 
    sentiment: string;
    keyArguments: string[];
  }>>().notNull(),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardSpeakerAnalysisSchema = createInsertSchema(hansardSpeakerAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardSpeakerAnalysis = z.infer<typeof insertHansardSpeakerAnalysisSchema>;
export type HansardSpeakerAnalysis = typeof hansardSpeakerAnalysis.$inferSelect;

export const hansardDetailedSummary = pgTable("hansard_detailed_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  keyArguments: jsonb("key_arguments").$type<string[]>().notNull(),
  decisions: jsonb("decisions").$type<string[]>().notNull(),
  actionItems: jsonb("action_items").$type<string[]>().notNull(),
  controversialPoints: jsonb("controversial_points").$type<string[]>().notNull(),
  summary: text("summary").notNull(),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardDetailedSummarySchema = createInsertSchema(hansardDetailedSummary).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardDetailedSummary = z.infer<typeof insertHansardDetailedSummarySchema>;
export type HansardDetailedSummary = typeof hansardDetailedSummary.$inferSelect;

export const hansardComprehensiveAnalysis = pgTable("hansard_comprehensive_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  introduction: text("introduction").notNull(),
  sections: jsonb("sections").$type<Array<{
    title: string;
    overview: string;
    keyPoints: Array<{
      heading: string;
      detail: string;
    }>;
  }>>().notNull(),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardComprehensiveAnalysisSchema = createInsertSchema(hansardComprehensiveAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardComprehensiveAnalysis = z.infer<typeof insertHansardComprehensiveAnalysisSchema>;
export type HansardComprehensiveAnalysis = typeof hansardComprehensiveAnalysis.$inferSelect;

export const hansardQaCache = pgTable("hansard_qa_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  context: text("context").notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertHansardQaCacheSchema = createInsertSchema(hansardQaCache).omit({
  id: true,
  createdAt: true,
});

export type InsertHansardQaCache = z.infer<typeof insertHansardQaCacheSchema>;
export type HansardQaCache = typeof hansardQaCache.$inferSelect;

export const hansardQaAnalysisCache = pgTable("hansard_qa_analysis_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  sectionType: varchar("section_type").notNull().default("menteri"),
  sessionInfo: text("session_info").notNull(),
  questions: jsonb("questions").$type<Array<{
    no: number;
    questioner: string;
    ministerTargeted: string;
    topic: string;
    summary: string;
  }>>().notNull(),
  totalQuestions: integer("total_questions").notNull().default(0),
  analyzedAt: timestamp("analyzed_at").notNull().default(sql`NOW()`),
});

export const insertHansardQaAnalysisCacheSchema = createInsertSchema(hansardQaAnalysisCache).omit({
  id: true,
  analyzedAt: true,
});

export type InsertHansardQaAnalysisCache = z.infer<typeof insertHansardQaAnalysisCacheSchema>;
export type HansardQaAnalysisCache = typeof hansardQaAnalysisCache.$inferSelect;

// Court Case News Articles table for scraped news review queue
export const courtCaseNewsArticles = pgTable("court_case_news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceUrl: text("source_url").notNull().unique(),
  sourceName: text("source_name").notNull(),
  headline: text("headline").notNull(),
  content: text("content").notNull(),
  publishedDate: timestamp("published_date"),
  extractedData: jsonb("extracted_data").$type<{
    mpName?: string;
    mpId?: string;
    caseNumber?: string;
    title?: string;
    courtLevel?: string;
    status?: string;
    charges?: string;
    outcome?: string;
    filingDate?: string;
  }>(),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  linkedCourtCaseId: varchar("linked_court_case_id").references(() => courtCases.id, { onDelete: 'set null' }),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertCourtCaseNewsArticleSchema = createInsertSchema(courtCaseNewsArticles).omit({
  id: true,
  scrapedAt: true,
  createdAt: true,
  reviewedAt: true,
}).extend({
  publishedDate: z.coerce.date().nullable().optional(),
  extractedData: z.object({
    mpName: z.string().optional(),
    mpId: z.string().optional(),
    caseNumber: z.string().optional(),
    title: z.string().optional(),
    courtLevel: z.string().optional(),
    status: z.string().optional(),
    charges: z.string().optional(),
    outcome: z.string().optional(),
    filingDate: z.string().optional(),
  }).nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "needs_review"]).optional().default("pending"),
  reviewedBy: z.string().nullable().optional(),
  linkedCourtCaseId: z.string().nullable().optional(),
});

export const updateCourtCaseNewsArticleSchema = insertCourtCaseNewsArticleSchema.partial();

export type InsertCourtCaseNewsArticle = z.infer<typeof insertCourtCaseNewsArticleSchema>;
export type UpdateCourtCaseNewsArticle = z.infer<typeof updateCourtCaseNewsArticleSchema>;
export type CourtCaseNewsArticle = typeof courtCaseNewsArticles.$inferSelect;

// ========== PARLIAMENT BILLS ==========
// Bills table for storing scraped bills from Parliament website
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  billNumber: text("bill_number"),
  introductionDate: text("introduction_date"),
  status: text("status").notNull().default("Unknown"),
  fullTextUrl: text("full_text_url"),
  sourceUrl: text("source_url"),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  scrapedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBillSchema = insertBillSchema.partial();

export type InsertBill = z.infer<typeof insertBillSchema>;
export type UpdateBill = z.infer<typeof updateBillSchema>;
export type Bill = typeof bills.$inferSelect;

// Bill PDF Files table for storing downloaded PDF files of bills
export const billPdfFiles = pgTable("bill_pdf_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  contentType: text("content_type").notNull().default("application/pdf"),
  pdfData: bytea("pdf_data").notNull(),
  md5Hash: text("md5_hash"),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`NOW()`),
  uploadedBy: varchar("uploaded_by"),
  downloadedFromUrl: text("downloaded_from_url"),
});

export const insertBillPdfFileSchema = createInsertSchema(billPdfFiles).omit({
  id: true,
  uploadedAt: true,
}).extend({
  pdfData: z.any(), // Buffer type - validated on server only
  md5Hash: z.string().optional(),
  uploadedBy: z.string().optional(),
  downloadedFromUrl: z.string().optional(),
});

export type InsertBillPdfFile = z.infer<typeof insertBillPdfFileSchema>;
export type BillPdfFile = typeof billPdfFiles.$inferSelect;

// Bill Impacts table for storing AI-generated impact analysis
export const billImpacts = pgTable("bill_impacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  affectedGroups: text("affected_groups").array(),
  impactType: text("impact_type"), // 'positive', 'negative', 'mixed', 'neutral'
  keyPoints: text("key_points").array(),
  generatedBy: text("generated_by").default("ai"),
  generatedAt: timestamp("generated_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertBillImpactSchema = createInsertSchema(billImpacts).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBillImpactSchema = insertBillImpactSchema.partial();

export type InsertBillImpact = z.infer<typeof insertBillImpactSchema>;
export type UpdateBillImpact = z.infer<typeof updateBillImpactSchema>;
export type BillImpact = typeof billImpacts.$inferSelect;

// Bill Grok Reviews table for storing Grok AI-generated comprehensive reviews
export const billGrokReviews = pgTable("bill_grok_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  review: text("review").notNull(), // Markdown-formatted comprehensive review
  generatedBy: text("generated_by").default("grok"),
  generatedAt: timestamp("generated_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertBillGrokReviewSchema = createInsertSchema(billGrokReviews).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBillGrokReviewSchema = insertBillGrokReviewSchema.partial();

export type InsertBillGrokReview = z.infer<typeof insertBillGrokReviewSchema>;
export type UpdateBillGrokReview = z.infer<typeof updateBillGrokReviewSchema>;
export type BillGrokReview = typeof billGrokReviews.$inferSelect;

// ========== PARLIAMENTARY ORAL ANSWERS ==========
// Parliamentary oral answers table for storing scraped jawapan lisan from Parliament website
export const parliamentaryOralAnswers = pgTable("parliamentary_oral_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionNumber: text("question_number"),
  title: text("title").notNull(),
  questionerName: text("questioner_name"),
  questionerMpId: varchar("questioner_mp_id").references(() => mps.id),
  answererName: text("answerer_name"),
  answererMinistry: text("answerer_ministry"),
  dateAsked: text("date_asked"),
  status: text("status").notNull().default("Unknown"),
  answerText: text("answer_text"),
  questionText: text("question_text"),
  fullTextUrl: text("full_text_url"),
  sourceUrl: text("source_url"),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertParliamentaryOralAnswerSchema = createInsertSchema(parliamentaryOralAnswers).omit({
  id: true,
  scrapedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateParliamentaryOralAnswerSchema = insertParliamentaryOralAnswerSchema.partial();

export type InsertParliamentaryOralAnswer = z.infer<typeof insertParliamentaryOralAnswerSchema>;
export type UpdateParliamentaryOralAnswer = z.infer<typeof updateParliamentaryOralAnswerSchema>;
export type ParliamentaryOralAnswer = typeof parliamentaryOralAnswers.$inferSelect;

// Parliamentary answer PDF Files table for storing downloaded PDF files of answers
export const parliamentaryAnswerPdfFiles = pgTable("parliamentary_answer_pdf_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  answerId: varchar("answer_id").notNull().references(() => parliamentaryOralAnswers.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  contentType: text("content_type").notNull().default("application/pdf"),
  pdfData: bytea("pdf_data").notNull(),
  md5Hash: text("md5_hash"),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`NOW()`),
  uploadedBy: varchar("uploaded_by"),
  downloadedFromUrl: text("downloaded_from_url"),
});

export const insertParliamentaryAnswerPdfFileSchema = createInsertSchema(parliamentaryAnswerPdfFiles).omit({
  id: true,
  uploadedAt: true,
}).extend({
  pdfData: z.any(), // Buffer type - validated on server only
  md5Hash: z.string().optional(),
  uploadedBy: z.string().optional(),
  downloadedFromUrl: z.string().optional(),
});

export type InsertParliamentaryAnswerPdfFile = z.infer<typeof insertParliamentaryAnswerPdfFileSchema>;
export type ParliamentaryAnswerPdfFile = typeof parliamentaryAnswerPdfFiles.$inferSelect;

export const dunMembers = pgTable("dun_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull(),
  constituencyCode: text("constituency_code").notNull(),
  constituencyName: text("constituency_name").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  party: text("party"),
  photoUrl: text("photo_url"),
  detailUrl: text("detail_url"),
  // Sarawak DUN salary and allowance fields (RM per month unless specified)
  baseSalary: integer("base_salary").default(11130),
  serviceAllowance: integer("service_allowance").default(3870),
  constituencyAllowance: integer("constituency_allowance").default(10500), // 6,000-15,000 average
  sittingAllowance: integer("sitting_allowance").default(450), // per day from Nov 2024
  travelAllowance: integer("travel_allowance").default(2000),
  entertainmentAllowance: integer("entertainment_allowance").default(1500),
  housingAllowance: integer("housing_allowance").default(3000),
  totalMonthlyAllowance: integer("total_monthly_allowance").default(40000), // 25,000-40,000 for ordinary ADUN
  // Cabinet position and salary (for Premier, Deputy CM, Ministers, etc.)
  cabinetRole: text("cabinet_role"), // Premier, Deputy Chief Minister, Minister, Deputy Minister
  cabinetBaseSalary: integer("cabinet_base_salary"), // Base salary for cabinet position
  cabinetEntertainment: integer("cabinet_entertainment"), // Entertainment allowance
  cabinetSpecialAllowance: integer("cabinet_special_allowance"), // Special allowance
  cabinetTotalSalary: integer("cabinet_total_salary"), // Total cabinet monthly emolument
  // Poverty and economic data from DOSM Kawasanku
  povertyRate: integer("poverty_rate"), // percentage * 10 (e.g. 125 = 12.5%)
  householdIncome: integer("household_income"), // median household income in RM
  giniCoefficient: integer("gini_coefficient"), // * 1000 (e.g. 350 = 0.350)
  unemploymentRate: integer("unemployment_rate"), // percentage * 10
  population: integer("population"),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertDunMemberSchema = createInsertSchema(dunMembers).omit({
  id: true,
  scrapedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDunMemberSchema = insertDunMemberSchema.partial();

export type InsertDunMember = z.infer<typeof insertDunMemberSchema>;
export type UpdateDunMember = z.infer<typeof updateDunMemberSchema>;
export type DunMember = typeof dunMembers.$inferSelect;

// ========== TOPIC SUMMARY CACHE ==========
export const topicSummaryCache = pgTable("topic_summary_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hansardRecordId: varchar("hansard_record_id").notNull().references(() => hansardRecords.id, { onDelete: "cascade" }),
  topicName: text("topic_name").notNull(),
  summary: text("summary").notNull(),
  keyPoints: jsonb("key_points").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  speakers: jsonb("speakers").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  quotes: jsonb("quotes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertTopicSummaryCacheSchema = createInsertSchema(topicSummaryCache).omit({
  id: true,
  createdAt: true,
});

export type InsertTopicSummaryCache = z.infer<typeof insertTopicSummaryCacheSchema>;
export type TopicSummaryCache = typeof topicSummaryCache.$inferSelect;

// ========== USER FEEDBACK ==========
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email"),
  feedbackType: text("feedback_type").notNull().default("general"),
  subject: text("subject"),
  message: text("message").notNull(),
  pageUrl: text("page_url"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  reviewedAt: true,
  createdAt: true,
}).extend({
  feedbackType: z.enum(["general", "bug", "suggestion", "question", "compliment"]).optional().default("general"),
  status: z.enum(["pending", "reviewed", "resolved"]).optional().default("pending"),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  subject: z.string().nullable().optional(),
  pageUrl: z.string().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
});

export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

// MP Report Cards - Performance grading and evaluation
export const mpReportCards = pgTable("mp_report_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id, { onDelete: "cascade" }),

  // Calculated scores (0-100)
  attendanceScore: integer("attendance_score").notNull().default(0),
  attendancePercentage: integer("attendance_percentage").notNull().default(0), // Raw attendance %
  participationScore: integer("participation_score").notNull().default(0),
  conductScore: integer("conduct_score").notNull().default(0),
  constituencyImpactScore: integer("constituency_impact_score").notNull().default(0),
  overallScore: integer("overall_score").notNull().default(0),

  // Letter grade (A-F)
  grade: text("grade").notNull().default("F"),

  // Metadata for calculations
  totalSpeeches: integer("total_speeches").notNull().default(0),
  averageSpeeches: integer("average_speeches").notNull().default(0),
  billsRaised: integer("bills_raised").notNull().default(0),
  questionsAsked: integer("questions_asked").notNull().default(0),
  inappropriateLanguageCount: integer("inappropriate_language_count").notNull().default(0),
  povertyRate: integer("poverty_rate").default(0),

  // Timestamps
  calculatedAt: timestamp("calculated_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMpReportCardSchema = createInsertSchema(mpReportCards).omit({
  id: true,
  calculatedAt: true,
  updatedAt: true,
});

export const updateMpReportCardSchema = insertMpReportCardSchema.partial();

export type InsertMpReportCard = z.infer<typeof insertMpReportCardSchema>;
export type UpdateMpReportCard = z.infer<typeof updateMpReportCardSchema>;
export type MpReportCard = typeof mpReportCards.$inferSelect;

// Extended type with MP details
export type MpReportCardWithDetails = MpReportCard & {
  mp: Mp;
};

// ========== MP CONTACT MESSAGES ==========
// Stores constituent messages sent to MPs via the contact form
export const mpContactMessages = pgTable("mp_contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id, { onDelete: "cascade" }),

  // Sender information
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderPhone: text("sender_phone"),

  // Message content
  subject: text("subject").notNull(),
  message: text("message").notNull(),

  // Categorization for anonymized summaries
  category: text("category").notNull().default("general"),
  // Categories: general, flooding_drainage, education, healthcare, infrastructure,
  // housing, employment, safety_crime, environment, transportation, other

  // Status tracking
  status: text("status").notNull().default("pending"),
  // Status: pending, read, replied, resolved, spam

  // Privacy and moderation
  isPublic: boolean("is_public").notNull().default(false), // If constituent agreed to share anonymously
  isSpam: boolean("is_spam").notNull().default(false),

  // Response tracking
  repliedAt: timestamp("replied_at"),
  repliedBy: varchar("replied_by"), // Admin/MP user ID
  replyMessage: text("reply_message"),

  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  emailSent: boolean("email_sent").notNull().default(false),

  // Timestamps
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  readAt: timestamp("read_at"),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMpContactMessageSchema = createInsertSchema(mpContactMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
  updatedAt: true,
  repliedAt: true,
}).extend({
  category: z.enum([
    "general",
    "flooding_drainage",
    "education",
    "healthcare",
    "infrastructure",
    "housing",
    "employment",
    "safety_crime",
    "environment",
    "transportation",
    "corruption",
    "youth_sports",
    "poverty_welfare",
    "other"
  ]).optional().default("general"),
  status: z.enum(["pending", "read", "replied", "resolved", "spam"]).optional().default("pending"),
  senderEmail: z.string().email(),
  senderPhone: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
  isSpam: z.boolean().optional().default(false),
  emailSent: z.boolean().optional().default(false),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  repliedBy: z.string().nullable().optional(),
  replyMessage: z.string().nullable().optional(),
});

export const updateMpContactMessageSchema = insertMpContactMessageSchema.partial();

export type InsertMpContactMessage = z.infer<typeof insertMpContactMessageSchema>;
export type UpdateMpContactMessage = z.infer<typeof updateMpContactMessageSchema>;
export type MpContactMessage = typeof mpContactMessages.$inferSelect;

// Extended type with MP details
export type MpContactMessageWithMp = MpContactMessage & {
  mp: Mp;
};

// Hansard Sync Logs table for tracking automated sync operations
export const hansardSyncLogs = pgTable("hansard_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  triggeredBy: text("triggered_by").notNull(), // 'manual', 'scheduled', 'startup-recovery'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  lastKnownSession: text("last_known_session"),
  recordsFound: integer("records_found").default(0),
  recordsInserted: integer("records_inserted").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  errors: jsonb("errors").$type<Array<{ sessionNumber: string; error: string }>>(),
  success: boolean("success").default(true),
});

export const insertHansardSyncLogSchema = createInsertSchema(hansardSyncLogs).omit({
  id: true,
});

export type InsertHansardSyncLog = z.infer<typeof insertHansardSyncLogSchema>;
export type HansardSyncLog = typeof hansardSyncLogs.$inferSelect;

// ========== AGENTIC AI INFRASTRUCTURE ==========
// AI Agent Executions table for tracking all agent runs
export const aiAgentExecutions = pgTable("ai_agent_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull(), // 'hansard-monitor', 'data-quality', 'bill-analyzer', etc.
  targetId: varchar("target_id"), // ID of the resource being analyzed (hansardId, billId, mpId, etc.)
  targetType: text("target_type"), // 'hansard', 'bill', 'mp', 'constituency', 'global'

  // Execution lifecycle
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  startedAt: timestamp("started_at").notNull().default(sql`NOW()`),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),

  // Input/output
  parameters: jsonb("parameters").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  result: jsonb("result").$type<Record<string, any>>(),

  // Metadata
  triggeredBy: text("triggered_by").notNull(), // 'manual', 'scheduled', 'webhook', 'user'
  triggeredByUserId: varchar("triggered_by_user_id"),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),

  // Stats
  tokensUsed: integer("tokens_used"),
  apiCalls: integer("api_calls").default(0),
  dataUpdated: boolean("data_updated").default(false),

  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertAiAgentExecutionSchema = createInsertSchema(aiAgentExecutions).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
}).extend({
  targetId: z.string().nullable().optional(),
  targetType: z.enum(["hansard", "bill", "mp", "constituency", "global"]).nullable().optional(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional().default("pending"),
  parameters: z.record(z.any()).optional().default({}),
  result: z.record(z.any()).nullable().optional(),
  triggeredByUserId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  errorStack: z.string().nullable().optional(),
  tokensUsed: z.number().nullable().optional(),
  apiCalls: z.number().optional().default(0),
  dataUpdated: z.boolean().optional().default(false),
  durationMs: z.number().nullable().optional(),
});

export const updateAiAgentExecutionSchema = insertAiAgentExecutionSchema.partial();

export type InsertAiAgentExecution = z.infer<typeof insertAiAgentExecutionSchema>;
export type UpdateAiAgentExecution = z.infer<typeof updateAiAgentExecutionSchema>;
export type AiAgentExecution = typeof aiAgentExecutions.$inferSelect;

// AI Agent Findings table for storing specific insights discovered by agents
export const aiAgentFindings = pgTable("ai_agent_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull().references(() => aiAgentExecutions.id, { onDelete: "cascade" }),

  // Finding details
  findingType: text("finding_type").notNull(), // 'insight', 'inconsistency', 'suggestion', 'warning', 'error'
  severity: text("severity").notNull().default("info"), // 'critical', 'high', 'medium', 'low', 'info'
  title: text("title").notNull(),
  description: text("description").notNull(),

  // Related entities
  relatedMpIds: jsonb("related_mp_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  relatedHansardIds: jsonb("related_hansard_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  relatedBillIds: jsonb("related_bill_ids").$type<string[]>().default(sql`'[]'::jsonb`),

  // Evidence and actions
  evidence: jsonb("evidence").$type<Record<string, any>>(), // Supporting data
  suggestedAction: text("suggested_action"),
  actionTaken: text("action_taken"),
  actionTakenAt: timestamp("action_taken_at"),
  actionTakenBy: varchar("action_taken_by"),

  // Status
  status: text("status").notNull().default("new"), // 'new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),

  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertAiAgentFindingSchema = createInsertSchema(aiAgentFindings).omit({
  id: true,
  createdAt: true,
  actionTakenAt: true,
  reviewedAt: true,
}).extend({
  findingType: z.enum(["insight", "inconsistency", "suggestion", "warning", "error"]),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional().default("info"),
  relatedMpIds: z.array(z.string()).optional().default([]),
  relatedHansardIds: z.array(z.string()).optional().default([]),
  relatedBillIds: z.array(z.string()).optional().default([]),
  evidence: z.record(z.any()).nullable().optional(),
  suggestedAction: z.string().nullable().optional(),
  actionTaken: z.string().nullable().optional(),
  actionTakenBy: z.string().nullable().optional(),
  status: z.enum(["new", "acknowledged", "in_progress", "resolved", "dismissed"]).optional().default("new"),
  reviewedBy: z.string().nullable().optional(),
});

export const updateAiAgentFindingSchema = insertAiAgentFindingSchema.partial();

export type InsertAiAgentFinding = z.infer<typeof insertAiAgentFindingSchema>;
export type UpdateAiAgentFinding = z.infer<typeof updateAiAgentFindingSchema>;
export type AiAgentFinding = typeof aiAgentFindings.$inferSelect;

// AI Agent Schedules table for managing scheduled agent runs
export const aiAgentSchedules = pgTable("ai_agent_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull(),

  // Schedule configuration
  enabled: boolean("enabled").notNull().default(true),
  cronExpression: text("cron_expression"), // e.g., '0 0 * * *' for daily at midnight
  intervalMinutes: integer("interval_minutes"), // Alternative to cron

  // Parameters for scheduled runs
  parameters: jsonb("parameters").$type<Record<string, any>>().default(sql`'{}'::jsonb`),

  // Execution tracking
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"),
  lastExecutionId: varchar("last_execution_id").references(() => aiAgentExecutions.id),
  nextRunAt: timestamp("next_run_at"),

  // Metadata
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertAiAgentScheduleSchema = createInsertSchema(aiAgentSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
}).extend({
  enabled: z.boolean().optional().default(true),
  cronExpression: z.string().nullable().optional(),
  intervalMinutes: z.number().nullable().optional(),
  parameters: z.record(z.any()).optional().default({}),
  lastRunStatus: z.string().nullable().optional(),
  lastExecutionId: z.string().nullable().optional(),
  nextRunAt: z.date().nullable().optional(),
  createdBy: z.string().nullable().optional(),
});

export const updateAiAgentScheduleSchema = insertAiAgentScheduleSchema.partial();

export type InsertAiAgentSchedule = z.infer<typeof insertAiAgentScheduleSchema>;
export type UpdateAiAgentSchedule = z.infer<typeof updateAiAgentScheduleSchema>;
export type AiAgentSchedule = typeof aiAgentSchedules.$inferSelect;

// ========== MA63 DASHBOARD TABLES ==========
// Malaysia Agreement 1963 Implementation Tracker for Sabah & Sarawak

// MA63 Summary Statistics
export const ma63Summary = pgTable("ma63_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalIssues: integer("total_issues").notNull().default(0),
  resolved: integer("resolved").notNull().default(0),
  resolvedMadani: integer("resolved_madani").notNull().default(0), // Resolved under Madani government
  inProgress: integer("in_progress").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  overallProgress: integer("overall_progress").notNull().default(0), // Percentage (0-100)
  dataSource: text("data_source"),
  lastOfficialUpdate: timestamp("last_official_update"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMa63SummarySchema = createInsertSchema(ma63Summary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMa63SummarySchema = insertMa63SummarySchema.partial();

export type InsertMa63Summary = z.infer<typeof insertMa63SummarySchema>;
export type UpdateMa63Summary = z.infer<typeof updateMa63SummarySchema>;
export type Ma63Summary = typeof ma63Summary.$inferSelect;

// MA63 Categories
export const ma63Categories = pgTable("ma63_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(), // e.g., 'territorial', 'fiscal'
  nameEn: text("name_en").notNull(),
  nameMs: text("name_ms").notNull(),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  color: varchar("color", { length: 20 }), // Hex color code
  resolved: integer("resolved").notNull().default(0),
  inProgress: integer("in_progress").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  total: integer("total").notNull().default(0),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMa63CategorySchema = createInsertSchema(ma63Categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMa63CategorySchema = insertMa63CategorySchema.partial();

export type InsertMa63Category = z.infer<typeof insertMa63CategorySchema>;
export type UpdateMa63Category = z.infer<typeof updateMa63CategorySchema>;
export type Ma63Category = typeof ma63Categories.$inferSelect;

// MA63 Individual Issues
export const ma63Issues = pgTable("ma63_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => ma63Categories.id, { onDelete: "cascade" }),
  titleEn: text("title_en").notNull(),
  titleMs: text("title_ms").notNull(),
  descriptionEn: text("description_en"),
  descriptionMs: text("description_ms"),
  status: text("status").notNull().default("pending"), // 'resolved', 'in_progress', 'pending', 'blocked'
  priority: text("priority").default("medium"), // 'critical', 'high', 'medium', 'low'
  resolvedDate: timestamp("resolved_date"),
  resolvedBy: text("resolved_by"), // Which government/administration
  relatedDocuments: jsonb("related_documents").$type<string[]>().default(sql`'[]'::jsonb`),
  keyStakeholders: jsonb("key_stakeholders").$type<string[]>().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  isFeatured: boolean("is_featured").notNull().default(false), // Show in watchlist
  lastUpdate: timestamp("last_update"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMa63IssueSchema = createInsertSchema(ma63Issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["resolved", "in_progress", "pending", "blocked"]).optional().default("pending"),
  priority: z.enum(["critical", "high", "medium", "low"]).optional().default("medium"),
  relatedDocuments: z.array(z.string()).optional().default([]),
  keyStakeholders: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  categoryId: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionMs: z.string().nullable().optional(),
  resolvedDate: z.date().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lastUpdate: z.date().nullable().optional(),
});

export const updateMa63IssueSchema = insertMa63IssueSchema.partial();

export type InsertMa63Issue = z.infer<typeof insertMa63IssueSchema>;
export type UpdateMa63Issue = z.infer<typeof updateMa63IssueSchema>;
export type Ma63Issue = typeof ma63Issues.$inferSelect;

// MA63 Timeline Events
export const ma63TimelineEvents = pgTable("ma63_timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventDate: timestamp("event_date").notNull(),
  year: integer("year").notNull(),
  month: varchar("month", { length: 20 }),
  eventEn: text("event_en").notNull(),
  eventMs: text("event_ms").notNull(),
  eventType: text("event_type").notNull().default("milestone"), // 'milestone', 'resolved', 'in_progress', 'upcoming', 'setback'
  relatedIssueId: varchar("related_issue_id").references(() => ma63Issues.id, { onDelete: "set null" }),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  isMajor: boolean("is_major").notNull().default(false),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMa63TimelineEventSchema = createInsertSchema(ma63TimelineEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eventType: z.enum(["milestone", "resolved", "in_progress", "upcoming", "setback"]).optional().default("milestone"),
  isMajor: z.boolean().optional().default(false),
  relatedIssueId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  month: z.string().nullable().optional(),
  displayOrder: z.number().nullable().optional(),
});

export const updateMa63TimelineEventSchema = insertMa63TimelineEventSchema.partial();

export type InsertMa63TimelineEvent = z.infer<typeof insertMa63TimelineEventSchema>;
export type UpdateMa63TimelineEvent = z.infer<typeof updateMa63TimelineEventSchema>;
export type Ma63TimelineEvent = typeof ma63TimelineEvents.$inferSelect;

// MA63 Priority Watchlist Items
export const ma63WatchlistItems = pgTable("ma63_watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").references(() => ma63Issues.id, { onDelete: "cascade" }),
  titleEn: text("title_en").notNull(),
  titleMs: text("title_ms").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionMs: text("description_ms").notNull(),
  status: text("status").notNull().default("in_progress"), // 'resolved', 'in_progress', 'pending', 'blocked'
  priority: text("priority").notNull().default("medium"), // 'critical', 'high', 'medium', 'low'
  lastUpdateDate: timestamp("last_update_date"),
  lastUpdateNote: text("last_update_note"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertMa63WatchlistItemSchema = createInsertSchema(ma63WatchlistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["resolved", "in_progress", "pending", "blocked"]).optional().default("in_progress"),
  priority: z.enum(["critical", "high", "medium", "low"]).optional().default("medium"),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().optional().default(0),
  issueId: z.string().nullable().optional(),
  lastUpdateDate: z.date().nullable().optional(),
  lastUpdateNote: z.string().nullable().optional(),
});

export const updateMa63WatchlistItemSchema = insertMa63WatchlistItemSchema.partial();

export type InsertMa63WatchlistItem = z.infer<typeof insertMa63WatchlistItemSchema>;
export type UpdateMa63WatchlistItem = z.infer<typeof updateMa63WatchlistItemSchema>;
export type Ma63WatchlistItem = typeof ma63WatchlistItems.$inferSelect;

// ========== PARLIAMENTARY COMMITTEES ==========
// Committee membership tracking for scoring and transparency

export const COMMITTEE_ROLES = ["chair", "member", "vice-chair"] as const;
export type CommitteeRole = typeof COMMITTEE_ROLES[number];

export const committeeMembers = pgTable("committee_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id, { onDelete: "cascade" }),

  // Committee identification
  committeeName: text("committee_name").notNull(),    // "Public Accounts Committee"
  committeeAbbr: text("committee_abbr"),              // "PAC" - optional abbreviation

  // Role and status
  role: text("role").$type<CommitteeRole>().notNull(), // "chair", "member", "vice-chair"

  // Session tracking (15th Parliament, 14th Parliament, etc.)
  parliamentTerm: text("parliament_term").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),                     // null = currently serving

  // Data quality
  sourceUrl: text("source_url"),                      // Where data came from for verification
  verificationNotes: text("verification_notes"),      // Any caveats about data accuracy

  // Timestamps
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertCommitteeMemberSchema = createInsertSchema(committeeMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(COMMITTEE_ROLES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
});

export const updateCommitteeMemberSchema = insertCommitteeMemberSchema.partial().omit({ mpId: true });

export type InsertCommitteeMember = z.infer<typeof insertCommitteeMemberSchema>;
export type UpdateCommitteeMember = z.infer<typeof updateCommitteeMemberSchema>;
export type CommitteeMember = typeof committeeMembers.$inferSelect;

// ========== WEEKLY POLLS ==========
// Weekly polling system with AI-generated topics

// Polls table - stores the weekly poll questions
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  questionMs: text("question_ms"), // Malay translation
  description: text("description"), // Optional context for the poll
  category: text("category").notNull().default("general"), // politics, economy, social, education, etc.

  // Week tracking
  weekNumber: integer("week_number").notNull(), // ISO week number
  year: integer("year").notNull(),

  // Status
  status: text("status").notNull().default("draft"), // draft, active, closed, archived

  // AI generation metadata
  generatedBy: text("generated_by").default("ai"), // ai, manual
  aiPromptUsed: text("ai_prompt_used"), // Store the prompt for reference
  sourceContext: text("source_context"), // What data was used to generate this poll

  // Timing
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),

  // Stats (denormalized for performance)
  totalVotes: integer("total_votes").notNull().default(0),

  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalVotes: true,
}).extend({
  category: z.enum(["politics", "economy", "social", "education", "healthcare", "environment", "infrastructure", "governance", "general"]).optional().default("general"),
  status: z.enum(["draft", "active", "closed", "archived"]).optional().default("draft"),
  generatedBy: z.enum(["ai", "manual"]).optional().default("ai"),
  questionMs: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  aiPromptUsed: z.string().nullable().optional(),
  sourceContext: z.string().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const updatePollSchema = insertPollSchema.partial();

export type InsertPoll = z.infer<typeof insertPollSchema>;
export type UpdatePoll = z.infer<typeof updatePollSchema>;
export type Poll = typeof polls.$inferSelect;

// Poll Options table - stores the answer choices for each poll
export const pollOptions = pgTable("poll_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  optionTextMs: text("option_text_ms"), // Malay translation
  displayOrder: integer("display_order").notNull().default(0),

  // Stats (denormalized for performance)
  voteCount: integer("vote_count").notNull().default(0),
  votePercentage: integer("vote_percentage").notNull().default(0), // Stored as percentage * 100 (e.g., 5550 = 55.50%)

  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({
  id: true,
  createdAt: true,
  voteCount: true,
  votePercentage: true,
}).extend({
  optionTextMs: z.string().nullable().optional(),
  displayOrder: z.number().optional().default(0),
});

export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollOption = typeof pollOptions.$inferSelect;

// Poll Votes table - stores individual votes with deduplication
export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  optionId: varchar("option_id").notNull().references(() => pollOptions.id, { onDelete: "cascade" }),

  // Voter identification for deduplication (anonymous)
  voterFingerprint: text("voter_fingerprint").notNull(), // Hash of IP + user agent for deduplication
  ipAddress: text("ip_address"), // For rate limiting

  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  createdAt: true,
}).extend({
  ipAddress: z.string().nullable().optional(),
});

export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;
export type PollVote = typeof pollVotes.$inferSelect;

// Extended types for API responses
export type PollWithOptions = Poll & {
  options: PollOption[];
};

export type PollWithResults = Poll & {
  options: PollOption[];
  hasVoted?: boolean;
  userVotedOptionId?: string;
};

// Bills to Watch table - curated key legislation for the homepage card
export const billsToWatch = pgTable("bills_to_watch", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titleEn: text("title_en").notNull(),
  titleMs: text("title_ms").notNull(),
  billNumber: text("bill_number"),
  status: text("status").notNull().default("pending"),
  summaryEn: text("summary_en").notNull(),
  summaryMs: text("summary_ms").notNull(),
  detailsEn: text("details_en"),
  detailsMs: text("details_ms"),
  isFeatured: boolean("is_featured").notNull().default(false),
  icon: text("icon").notNull().default("scroll"),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  sourceUrl: text("source_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertBillToWatchSchema = createInsertSchema(billsToWatch).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBillToWatch = z.infer<typeof insertBillToWatchSchema>;
export type BillToWatch = typeof billsToWatch.$inferSelect;

// ============================================================================
// GigHalal Authentication Tables
// Social login + email/password for Malaysian freelancer platform
// ============================================================================

// GigHalal users table — supports email/password + social OAuth providers
export const gigUsers = pgTable("gig_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Profile
  username: text("username").notNull(),
  email: text("email"),
  phone: text("phone"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accountType: text("account_type").notNull().default("freelancer"), // freelancer | employer

  // Email/password auth (nullable for social-only users)
  passwordHash: text("password_hash"),

  // OAuth provider data
  authProvider: text("auth_provider").notNull().default("email"), // email | facebook | google | apple | whatsapp
  providerId: text("provider_id"), // External provider user ID
  providerData: jsonb("provider_data").$type<Record<string, unknown>>(),

  // SOCSO opt-in
  socsoAutoRegister: boolean("socso_auto_register").notNull().default(false),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertGigUserSchema = createInsertSchema(gigUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export type InsertGigUser = z.infer<typeof insertGigUserSchema>;
export type GigUser = typeof gigUsers.$inferSelect;

// WhatsApp OTP verification codes
export const whatsappOtpCodes = pgTable("whatsapp_otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export type WhatsappOtpCode = typeof whatsappOtpCodes.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM SUBSCRIPTION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// Public user accounts (separate from admin_users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  isAdmin: boolean("is_admin").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Subscription plans (e.g. monthly, yearly)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),        // 'monthly' | 'yearly'
  name: text("name").notNull(),
  priceMyr: integer("price_myr").notNull(),     // in sen (e.g. 1500 = RM 15.00)
  interval: text("interval").notNull(),         // 'month' | 'year'
  features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// User subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull(),             // 'active' | 'cancelled' | 'expired' | 'trial'
  isTrial: boolean("is_trial").notNull().default(false),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  billingProvider: text("billing_provider").notNull().default("manual"), // 'billplz' | 'stripe' | 'manual'
  billingProviderId: text("billing_provider_id"),  // external reference id
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Payment audit trail
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  amountMyr: integer("amount_myr").notNull(),   // in sen
  status: text("status").notNull(),             // 'pending' | 'paid' | 'failed' | 'refunded'
  billingProvider: text("billing_provider").notNull(),
  providerBillId: text("provider_bill_id"),     // Billplz bill_id / Stripe payment_intent_id
  providerPayload: jsonb("provider_payload"),   // raw webhook payload for audit
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Billing event log — every lifecycle event emitted by the billing service
// (subscription_created, payment_success, payment_failed, cancelled, renewed, refunded)
export const billingEvents = pgTable("billing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  transactionId: varchar("transaction_id").references(() => paymentTransactions.id),
  eventType: text("event_type").notNull(),       // 'subscription_created' | 'payment_success' | ...
  billingProvider: text("billing_provider").notNull(),
  providerEventId: text("provider_event_id"),    // idempotency key (bill id, event id)
  payload: jsonb("payload"),                     // full raw event for audit / replay
  processedAt: timestamp("processed_at").notNull().default(sql`now()`),
});

export type BillingEvent = typeof billingEvents.$inferSelect;
