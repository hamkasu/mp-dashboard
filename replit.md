# Malaysian Parliament MP Dashboard

## Overview
This web application provides a comprehensive dashboard for Malaysian Members of Parliament (MPs) from the Dewan Rakyat. It enables users to browse, search, and filter 222 MPs by party, state, and constituency. The application features detailed MP profiles, including party affiliation, constituency, gender, titles, roles, attendance records, allowance information, and tracks court cases and Malaysian Anti-Corruption Commission (SPRM) investigations. The project aims to present government data in an accessible, professional manner, adhering to Material Design principles and Government Digital Service standards, with ambitions for market potential and an accessible platform for government transparency.

## Recent Changes

### November 28, 2025 - Automated Court Case News Scraper
Added automated scraper to monitor Malaysian news sources for MP-related court cases:
- Monitors 6 Malaysian news sources: The Star, New Straits Times, Malay Mail, Benar News, Malaysiakini, Free Malaysia Today
- Uses Gemini AI to extract structured court case data (case number, charges, status, court level)
- Scraped articles stored in review queue for admin approval before publishing
- Cron jobs run twice daily at 8:00 AM and 6:00 PM Malaysia time
- Admin interface at `/court-cases-admin` for managing court cases and reviewing scraped articles
- Key files: `server/court-case-scraper.ts`, `server/court-case-cron.ts`, `client/src/pages/CourtCasesAdmin.tsx`

### November 28, 2025 - Senators Attending Dewan Rakyat Sessions
Added tracking for senators (Dewan Negara members) who attend Dewan Rakyat sessions:
- Added `senatorsAttending` JSONB field to hansard_records schema
- Scraper now extracts names from "Senator Yang Turut Hadir" section in Hansard PDFs
- Stops MP parsing before senator section to avoid counting senators as MPs
- Added dedicated "Senators" tab in Constituency Attendance view (separate from MPs)
- All Hansard import scripts updated to capture senator attendance data
- Note: Existing Hansard records need re-import to backfill senator data

### November 28, 2025 - Mandarin and Tamil Translations for Fundamental Rights
Added complete Mandarin (Chinese) and Tamil translations to the Fundamental Rights page:
- Full translations for all 8 constitutional articles (Articles 5, 6, 8, 9, 10, 11, 12, 13)
- Translated intro, limitations, and importance sections
- Added language selector buttons for 中文 (Chinese) and தமிழ் (Tamil)
- Localized Article labels and Print button text for all four languages
- Page now supports English, Bahasa Malaysia, Mandarin, and Tamil

### November 27, 2025 - Pre-computed Hansard Speaker Data
Moved speaker parsing from on-demand to pre-computed at scrape time for faster page loads:
- Updated `/api/hansard-records/:id/speakers` endpoint to prioritize pre-computed data from database
- Response now includes rich speaker data: totalSpeeches and speakingOrder per MP
- Falls back to PDF parsing only for records without pre-computed data
- Created backfill script (`npm run backfill-speakers`) to pre-compute speakers for existing records
- Backfill downloads and saves PDFs to database if only URL available, preventing repeated HTTP fetches

### November 27, 2025 - Railway Memory Optimization (24GB Configuration)
Optimized memory management for Railway's 32GB container:
- Node.js heap limit set to 24GB (--max-old-space-size=24576), leaving 8GB for OS and native allocations
- Updated memory thresholds: warning at 16GB, critical at 20GB, danger at 24GB, circuit breaker at 26GB
- Added pagination to bulk AI analysis: processes 5 records at a time instead of loading all
- Added `getHansardRecordIds()` and `getHansardRecordsBatch()` storage methods with stable ORDER BY
- Implemented automatic garbage collection (forceGC) between batches during heavy processing
- MAX_CONCURRENT_EXPENSIVE_REQUESTS set to 15 for the larger memory allocation
- Added 30-second GC cooldown to prevent excessive GC calls

### November 19, 2025 - Railway Authentication Fix
Fixed "Failed to serialize user into session" error for Railway production deployments:
- Improved passport session serialization with robust error handling and type validation
- Added comprehensive logging for production debugging with `[Auth]` prefixes
- Enhanced edge case handling for missing users and database connection issues
- Created deployment guides (`RAILWAY_ADMIN_RESET.md`) and automation script (`deploy-to-railway.sh`)
- Railway deployment now requires environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application adheres to Material Design and Government Digital Service principles, utilizing a custom theme with CSS variables for light/dark mode, the Inter font, and responsive grid layouts.

### Technical Implementations
**Frontend**: Built with React 18+ and TypeScript, utilizing Wouter for routing, TanStack Query for server state management, and shadcn/ui (Radix UI) with Tailwind CSS for components and styling. Key features include a Home Dashboard with MP grids, filters, search, and statistics; detailed MP Profile Pages with attendance, allowance, contact, court case, SPRM investigation, and Hansard speech metrics; Parliamentary Activity Page for legislative browsing; Hansard Records Page for transcripts and voting; and a Hansard Analysis Page for MP speech participation.

**Backend**: Developed with Express.js and TypeScript (ESM modules). It uses Drizzle ORM for PostgreSQL (Neon serverless driver) in production, with an in-memory storage for development. The API is RESTful, providing endpoints for MPs, statistics, court cases, SPRM investigations, and Hansard records.

**Data Processing**:
-   **Hansard Scraper**: Downloads and extracts PDFs from parlimen.gov.my, storing transcript text, PDF links, topics, speakers, and vote records.
-   **Hansard Speech Parser**: Extracts and tallies MP speeches from Hansard PDFs, prioritizing constituency names for accurate matching.
-   **Speech Aggregation**: Automatically tallies MP speech participation across all Hansard records, updating `hansardSessionsSpoke` and `totalSpeechInstances`.
-   **Parliamentary Activity Extraction**: Extracts Bills, Motions, and Questions from Hansard PDFs, linking them to MPs and storing them in the database.
-   **MP Data Refresh**: An admin endpoint recalculates all MP statistics from Hansard records, respecting `swornInDate`.

**Security**: Includes comprehensive security hardening with authentication & authorization via Passport.js, CSRF protection, a four-tier rate limiting system, security headers via Helmet.js, and audit logging for sensitive operations. Session security is ensured with configurable `SESSION_SECRET` and secure cookies.

**SEO Implementation**: Features a hybrid pre-rendering strategy for static HTML generation, a static sitemap and `robots.txt`, structured data (JSON-LD) for Person, GovernmentOrganization, and Dataset schemas, and dynamic meta tags for enhanced SEO. Bot detection serves pre-rendered content to search engines while regular users receive the full SPA.

### Data Models
The application uses several key data models:
-   **MP Schema**: Stores core MP details, financial data, performance metrics, and contact information.
-   **Court Case Schema**: Tracks individual court cases related to MPs.
-   **SPRM Investigation Schema**: Records Malaysian Anti-Corruption Commission investigations involving MPs.
-   **Hansard Record Schema**: Stores details of parliamentary session transcripts.
-   **Legislative Proposal Schema**: Captures information about bills and motions.
-   **Parliamentary Question Schema**: Records questions posed in parliament.

## External Dependencies

### Core Frameworks
-   React
-   Express
-   TypeScript
-   Vite

### Database & ORM
-   Drizzle ORM
-   Neon Serverless (PostgreSQL)
-   Drizzle Kit
-   Drizzle Zod

### UI & Styling
-   Radix UI
-   shadcn/ui
-   Tailwind CSS
-   class-variance-authority
-   Embla Carousel

### Data & State Management
-   TanStack Query
-   React Hook Form
-   Zod
-   @hookform/resolvers

### Utilities
-   clsx
-   tailwind-merge
-   date-fns
-   Wouter
-   Lucide React

### Development Tools
-   Replit Plugins
-   PostCSS
-   esbuild