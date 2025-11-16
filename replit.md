# Malaysian Parliament MP Dashboard

## Overview
This web application provides a comprehensive dashboard for Malaysian Members of Parliament (MPs) from the Dewan Rakyat. It enables users to browse, search, and filter 222 MPs by party, state, and constituency. The application features detailed MP profiles, including party affiliation, constituency, gender, titles, roles, attendance records, allowance information, and tracks court cases and Malaysian Anti-Corruption Commission (SPRM) investigations. The project aims to present government data in an accessible, professional manner, adhering to Material Design principles and Government Digital Service standards.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Frameworks & Libraries**: React 18+ with TypeScript, Wouter for routing, TanStack Query for server state, shadcn/ui (Radix UI), Tailwind CSS.
**Design System**: Material Design and Government Digital Service principles, custom theme with CSS variables for light/dark mode, Inter font, responsive grid layouts.
**Key Features**:
-   **Home Dashboard**: MP grid, filters, search, statistics (Total MPs, Party Breakdown, Gender Diversity, State Coverage, Avg Attendance), sort options (Name, Best/Worst Attendance), color-coded attendance displays. MP cards now display cumulative speech counts from Hansard records showing total speeches, sessions spoke, and average speeches per session.
-   **MP Profile Page**: Detailed individual MP information, monthly/yearly allowance calculations, attendance section with color-coded days, allowance information table, court cases section with status badges, SPRM investigations section, Hansard speech participation metrics.
-   **Parliamentary Activity Page**: Browse legislative proposals, debate participations, parliamentary questions, court cases, and SPRM investigations with search and filters.
-   **Hansard Records Page**: Browse parliamentary session transcripts with search/filter, collapsible sections for speakers, vote records, full transcripts, PDF links, topics, vote tallies, and a "View by Constituency" dialog showing attendance grouped by state and party.
-   **Hansard Analysis Page**: Analyze individual MP speech participation from database-stored Hansard PDFs. Users select a Hansard session (from existing database records) and an MP, then the system downloads the PDF from stored URLs, parses all speeches, and displays detailed statistics including total speeches, word count, attendance status, speech excerpts, question summaries, and mentioned MPs. Backend uses axios to fetch PDFs from stored URLs and pdf-parse for text extraction.
-   **MP Attendance Report Page**: Tracks MP and constituency participation; filter by date range, party, state; view attendance statistics; toggle between "By MP" and "By Constituency" views.
**State Management**: Server state by TanStack Query; local UI state by React hooks.

### Backend Architecture
**Framework**: Express.js with TypeScript (ESM modules).
**Data Layer**: In-memory storage (MemStorage) for development, Drizzle ORM for PostgreSQL with DbStorage for production (Neon serverless driver).
**API Design (RESTful)**: Endpoints for MPs, statistics, court cases, SPRM investigations, and Hansard records (including search, single record, and constituency attendance). Admin endpoints for database seeding and status (`/api/admin/seed`, `/api/admin/db-status`).
**Hansard Scraper**: Utility (`server/hansard-scraper.ts`) to download and extract PDFs from parlimen.gov.my. Uses tree-based traversal to navigate the parliament archive structure, filtering for 15th Parliament ("Parlimen Kelima Belas") only. Includes 2-second delay between requests for politeness. Stores full transcript text, PDF links, topics, speakers, and vote records. Default download limit is 500 records per request.
**Hansard Speech Parser**: Advanced speaker extraction (`server/hansard-speaker-parser.ts`) parses MP speeches from Hansard PDFs using regex patterns to identify speaker brackets (e.g., "[Dato' Sri Anwar Ibrahim]:"), extracts MP names with titles, cleans text by removing parentheses/brackets, filters out parliamentary officials (Speaker/Deputy Speaker), deduplicates speakers per session, and tallies total speeches per MP. Reprocessing all 192 Hansard PDFs achieved 100% success rate (vs 0.5% before fixes).
**Constituency-Based Matching** (November 2025): Hansard speaker matching prioritizes constituency names over MP names to avoid misspelling issues. Hansard transcripts often contain name spelling variations (e.g., missing titles, different transliterations), but constituencies in brackets (e.g., "[Paya Besar - Dato' Sri Anwar Ibrahim]") are more reliable. The parser now matches by: (1) Constituency first (most reliable), (2) Exact name via MPNameMatcher (fallback), (3) Fuzzy name matching (last resort). Test validation across 6 Hansard sessions identified 115 unique constituencies with accurate speech counts. This approach significantly improves accuracy by avoiding name misspelling errors while preserving coverage for non-bracketed speaker formats.
**Speech Aggregation**: Automatic system (`server/aggregate-speeches.ts`) tallies MP speech participation across all Hansard records. Runs automatically after daily Hansard sync cron job. Updates MP fields `hansardSessionsSpoke` (unique sessions where MP spoke) and `totalSpeechInstances` (total speeches across all sessions). Deduplicates speakers per session to prevent overcounting. Results: 221 MPs updated, top speaker Alice Lau with 8,028 speeches across 183 sessions.
**MP Data Refresh** (November 2025): Authenticated admin endpoint `/api/admin/refresh-mp-data` allows manual recalculation of all MP statistics from Hansard records. System aggregates both attendance (days attended, total parliament days) and speech participation (sessions spoke, total speeches) for all 222 MPs. Respects each MP's `swornInDate` to only count sessions after they were sworn in, preventing incorrect attribution for mid-term MPs. Updates all MP records including zeros to prevent stale data. Accessible via Hansard Admin page with real-time progress feedback. Requires authentication via `ensureAuthenticated` middleware.
**Development & Production**: Vite dev server for frontend, esbuild for backend bundling. In-memory storage for dev, PostgreSQL for production.

### Data Models
**MP Schema**: Core details (`id`, `name`, `party`, `constituency`, `gender`, `role`, etc.), financial data (`mpAllowance`, `ministerSalary`, etc.), performance (`daysAttended`, `hansardSessionsSpoke`, `totalSpeechInstances`).
**User Schema**: `id`, `username`, `password` (authentication schema defined).
**Court Case Schema**: `id`, `mpId`, `caseNumber`, `title`, `courtLevel`, `status`, `filingDate`, `outcome`, `charges`, `documentLinks`.
**SPRM Investigation Schema**: `id`, `mpId`, `caseNumber`, `title`, `status`, `startDate`, `endDate`, `outcome`, `charges`.
**Hansard Record Schema**: `id`, `sessionNumber`, `sessionDate`, `parliamentTerm`, `transcript`, `pdfLinks`, `topics`, `speakers`, `speakerStats`, `voteRecords`.

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

### Session & Authentication
-   express-session (session middleware)
-   connect-pg-simple (PostgreSQL session store)
-   bcryptjs (password hashing)
-   passport (authentication middleware - optional)

## Authentication & Security (November 2025)

### Session-Based Authentication
-   **Authentication Method**: Secure session-based authentication using express-session with PostgreSQL persistence
-   **Session Storage**: PostgreSQL-based session store (connect-pg-simple) for production reliability
-   **Session Persistence**: Sessions survive server restarts and Railway dyno recycling
-   **Session Lifetime**: 24-hour expiration with automatic cleanup
-   **Cookie Security**: httpOnly, secure (HTTPS in production), SameSite=lax for CSRF protection

### Admin Authentication
-   **Login Endpoint**: POST `/api/auth/login` (username/password)
-   **Logout Endpoint**: POST `/api/auth/logout` (destroys session)
-   **Status Endpoint**: GET `/api/auth/me` (check authentication status)
-   **Login Page**: `/login` - dedicated admin login interface
-   **Default Credentials**: admin/admin123 (override with ADMIN_USERNAME and ADMIN_PASSWORD env vars)

### Protected Endpoints
All admin endpoints require authentication via `ensureAuthenticated` middleware:
-   DELETE `/api/hansard-records/:id` - Delete Hansard record
-   POST `/api/admin/seed` - Seed database
-   POST `/api/admin/trigger-hansard-check` - Trigger Hansard scraper
-   POST `/api/hansard-records/bulk-delete` - Bulk delete Hansard records

### Security Improvements (Token Auth Removed)
Previous token-based authentication was **removed** (November 2025) due to:
-   XSS vulnerability (tokens stored in localStorage)
-   No session expiration
-   Difficult to revoke access
-   Not suitable for production deployment

Current session-based authentication provides:
-   ✅ Secure httpOnly cookies (protected from XSS)
-   ✅ Automatic session expiration
-   ✅ Database-backed persistence (survives restarts)
-   ✅ CSRF protection
-   ✅ Production-ready for Railway deployment

### Railway Deployment Requirements
-   `SESSION_SECRET`: 32+ character random string (required for secure sessions)
-   `DATABASE_URL`: Auto-configured by Railway PostgreSQL addon
-   `ADMIN_USERNAME` & `ADMIN_PASSWORD`: Optional custom admin credentials
-   `NODE_ENV=production`: Auto-configured by Railway
-   `PUBLIC_BASE_URL` or `RAILWAY_STATIC_URL`: **Critical** - Your app's public URL (e.g., https://your-app.up.railway.app) - required for PDF links in background jobs to work correctly

**Important**: Without setting a public base URL environment variable, PDF downloads from Hansard records will fail in production because background cron jobs will generate `localhost` URLs instead of your actual domain.

See `RAILWAY_DEPLOYMENT.md` for complete deployment guide.

## SEO Implementation (November 2025)

### Pre-rendering Strategy
-   **Hybrid Approach**: Pre-rendered static HTML for search bots + Interactive SPA for users
-   **Build Process**: `npm run build` chains vite build → esbuild server → pre-render script
-   **Output**: 227 static HTML files in `dist/prerendered/` (homepage + 222 MP profiles + 4 stats pages)
-   **URL Mapping**: Safe cross-platform filenames (e.g., `/mp/123` → `mp_123.html`) stored in `url-map.json`
-   **Bot Detection**: Middleware (`server/bot-detector.ts`) detects search bots and serves pre-rendered HTML; regular users get full SPA

### Sitemap & Robots.txt
-   **Static Sitemap**: Generated at build time (`dist/public/sitemap.xml`) with all 227 pre-rendered URLs
-   **Robots.txt**: Located at `dist/public/robots.txt`, allows public pages while blocking `/login`, `/hansard-admin`, and `/api/`, blocks AI bots (GPTBot, CCBot, anthropic-ai)
-   **Sitemap Reference**: robots.txt points to sitemap.xml for search engine discovery

### Structured Data (JSON-LD)
-   **Person Schema**: All 222 MP profile pages include Person schema with government official data (name, role, party, constituency, photo)
-   **GovernmentOrganization Schema**: Homepage includes organization schema linking to Malaysian Parliament - Dewan Rakyat
-   **Dataset Schemas**: Homepage and all stats pages include Dataset schema describing MP directory, attendance records, Hansard records, allowances, and parliamentary activities data
-   **Schema.org Compliance**: All structured data follows Schema.org standards for government data

### Meta Tags & SEO
-   **Dynamic Meta Tags**: Each pre-rendered page includes unique title, description, canonical URL, Open Graph tags, and Twitter Card metadata
-   **Enhanced Meta Description**: Emphasizes tracking MPs, voting records, and parliamentary activities
-   **Keywords**: Includes "MP dashboard", "voting records", "parliamentary activities", "court cases", "SPRM investigations"
-   **Canonical URLs**: Point to `https://myparliament.calmic.com.my` with proper page paths
-   **Open Graph Tags**: Complete metadata for social media sharing (title, description, URL, site name, images)
-   **Twitter Cards**: Summary large image cards for better Twitter/X sharing

### SEO-Optimized Content
-   **SEO-optimized H1**: "Malaysian Parliament MP Dashboard"
-   **Descriptive Content**: Clear explanation of dashboard features and value proposition
-   **Key Features List**: Highlights attendance tracking, Hansard access, court case monitoring, salary transparency

### Technical Implementation
-   **Pre-render Script**: `server/prerender.ts` generates all static HTML at build time
-   **Bot Detection**: `server/bot-detector.ts` identifies search engines (Googlebot, Bingbot, etc.)
-   **Server Integration**: `server/vite.ts` loads URL map and serves appropriate content based on user agent
-   **Build Pipeline**: Automated through `package.json` build script

### Google Search Console
-   **Setup Documentation**: Complete guide in `SEO_SETUP.md` for sitemap submission and verification
-   **Expected Coverage**: 227 total pages (1 homepage + 222 MP profiles + 4 stats pages)