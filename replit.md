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
-   **MP Attendance Report Page**: Tracks MP and constituency participation; filter by date range, party, state; view attendance statistics; toggle between "By MP" and "By Constituency" views.
**State Management**: Server state by TanStack Query; local UI state by React hooks.

### Backend Architecture
**Framework**: Express.js with TypeScript (ESM modules).
**Data Layer**: In-memory storage (MemStorage) for development, Drizzle ORM for PostgreSQL with DbStorage for production (Neon serverless driver).
**API Design (RESTful)**: Endpoints for MPs, statistics, court cases, SPRM investigations, and Hansard records (including search, single record, and constituency attendance). Admin endpoints for database seeding and status (`/api/admin/seed`, `/api/admin/db-status`).
**Hansard Scraper**: Utility (`server/hansard-scraper.ts`) to download and extract PDFs from parlimen.gov.my. Uses tree-based traversal to navigate the parliament archive structure, filtering for 15th Parliament ("Parlimen Kelima Belas") only. Includes 2-second delay between requests for politeness. Stores full transcript text, PDF links, topics, speakers, and vote records. Default download limit is 500 records per request.
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
-   connect-pg-simple (PostgreSQL session store)

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