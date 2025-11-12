CREATE TABLE "court_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_id" varchar NOT NULL,
	"case_number" text NOT NULL,
	"title" text NOT NULL,
	"court_level" text NOT NULL,
	"status" text NOT NULL,
	"filing_date" timestamp NOT NULL,
	"outcome" text,
	"charges" text NOT NULL,
	"document_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "court_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "debate_participations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_id" varchar NOT NULL,
	"topic" text NOT NULL,
	"date" timestamp NOT NULL,
	"contribution" text NOT NULL,
	"hansard_reference" text,
	"position" text
);
--> statement-breakpoint
CREATE TABLE "hansard_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_number" text NOT NULL,
	"session_date" timestamp NOT NULL,
	"parliament_term" text NOT NULL,
	"sitting" text NOT NULL,
	"transcript" text NOT NULL,
	"summary" text,
	"summary_language" text DEFAULT 'en',
	"summarized_at" timestamp,
	"pdf_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vote_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attended_mp_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"absent_mp_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constituencies_present" integer,
	"constituencies_absent" integer,
	"constituencies_absent_rule91" integer,
	"created_at" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legislative_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_id" varchar NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"date_proposed" timestamp NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"hansard_reference" text,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "mps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"party" text NOT NULL,
	"parliament_code" text NOT NULL,
	"constituency" text NOT NULL,
	"state" text NOT NULL,
	"gender" text NOT NULL,
	"title" text,
	"role" text,
	"sworn_in_date" timestamp NOT NULL,
	"mp_allowance" integer NOT NULL,
	"minister_salary" integer DEFAULT 0 NOT NULL,
	"days_attended" integer DEFAULT 0 NOT NULL,
	"total_parliament_days" integer DEFAULT 0 NOT NULL,
	"hansard_sessions_spoke" integer DEFAULT 0 NOT NULL,
	"entertainment_allowance" integer DEFAULT 2500 NOT NULL,
	"handphone_allowance" integer DEFAULT 2000 NOT NULL,
	"computer_allowance" integer DEFAULT 6000 NOT NULL,
	"dress_wear_allowance" integer DEFAULT 1000 NOT NULL,
	"parliament_sitting_allowance" integer DEFAULT 400 NOT NULL,
	"government_meeting_days" integer DEFAULT 0 NOT NULL,
	"is_minister" boolean DEFAULT false NOT NULL,
	"ministerial_position" text
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed" timestamp DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parliamentary_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_id" varchar NOT NULL,
	"question_text" text NOT NULL,
	"date_asked" timestamp NOT NULL,
	"ministry" text NOT NULL,
	"topic" text NOT NULL,
	"answer_status" text NOT NULL,
	"hansard_reference" text,
	"answer_text" text
);
--> statement-breakpoint
CREATE TABLE "sprm_investigations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_id" varchar NOT NULL,
	"case_number" text,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"outcome" text,
	"charges" text NOT NULL,
	"document_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "sprm_investigations_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_mp_id_mps_id_fk" FOREIGN KEY ("mp_id") REFERENCES "public"."mps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debate_participations" ADD CONSTRAINT "debate_participations_mp_id_mps_id_fk" FOREIGN KEY ("mp_id") REFERENCES "public"."mps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legislative_proposals" ADD CONSTRAINT "legislative_proposals_mp_id_mps_id_fk" FOREIGN KEY ("mp_id") REFERENCES "public"."mps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliamentary_questions" ADD CONSTRAINT "parliamentary_questions_mp_id_mps_id_fk" FOREIGN KEY ("mp_id") REFERENCES "public"."mps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprm_investigations" ADD CONSTRAINT "sprm_investigations_mp_id_mps_id_fk" FOREIGN KEY ("mp_id") REFERENCES "public"."mps"("id") ON DELETE no action ON UPDATE no action;