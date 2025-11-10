# Malaysian Parliament MP Dashboard

## Overview

This web application provides a comprehensive dashboard for Malaysian Members of Parliament (MPs) from the Dewan Rakyat. It enables users to browse, search, and filter 222 MPs by party, state, and constituency. The application features detailed MP profiles, including party affiliation, constituency, gender, titles, roles, attendance records, allowance information, and tracks court cases and Malaysian Anti-Corruption Commission (SPRM) investigations. The project aims to present government data in an accessible, professional manner, adhering to Material Design principles and Government Digital Service standards.

## Recent Changes

**November 10, 2025**:
- ✅ Added constituency-level attendance tracking feature:
  - Created `/api/hansard-records/:id/constituency-attendance` endpoint to return attended/absent constituencies by state
  - Built `ConstituencyAttendance` component with lazy loading and query gating to prevent unnecessary API calls
  - Integrated constituency view in Hansard page via dialog ("View by Constituency" button)
  - Added "By Constituency" tab to Attendance page alongside existing "By MP" view
  - Optimized query performance: API calls only fire when user explicitly opens constituency view (dialog or tab)
- ✅ Fixed Hansard PDF parsing bug where absent MPs were incorrectly identified
- ✅ Updated `extractNamesFromSection` in `server/hansard-scraper.ts` to use regex-based numbered entry extraction, preventing wrapped continuation lines from being counted as extra MPs
- ✅ Corrected seed data in `server/storage.ts` to reflect accurate absent MP count (16 instead of 38) for DR.6.11.2025 session
- ✅ Verified frontend displays correct attendance data from Hansard records

**November 9, 2025**:
- ✅ Added diagnostic logging to database seeding process for attendance tracking
- ✅ Created admin endpoints `/api/admin/seed` and `/api/admin/db-status` for Railway deployment troubleshooting
- ✅ Enhanced Hansard seeding with detailed logging of absent/attended MP counts

**November 8, 2025**:
- ✅ Built complete Hansard scraper utility (`server/hansard-scraper.ts`) to download and extract PDFs from parlimen.gov.my
- ✅ Implemented automatic pagination to fetch all Parliament 15 records across multiple pages
- ✅ Created scraping command (`server/scrape-hansard.ts`) to batch download all Hansard PDFs and store full text in database
- ✅ Built Hansard browsing page at `/hansard` with server-side search by keyword, date range, and session number
- ✅ Added backend search API (`/api/hansard-records/search`) with multi-criteria filtering
- ✅ Integrated Hansard navigation tab in header
- ✅ Migrated to PostgreSQL database with Neon
- ✅ Successfully seeded database with 222 MPs and related data

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Frameworks & Libraries**:
- React 18+ with TypeScript
- Wouter for client-side routing
- TanStack Query for server state management
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with a custom design system

**Design System**:
- Material Design and Government Digital Service principles
- Custom theme with CSS variables for light/dark mode
- Typography: Inter (headers/UI), system fonts (body)
- Responsive grid layouts for data presentation

**Key Features**:
- **Home Dashboard**: Displays an MP grid, filters, search, statistics (Total MPs, Party Breakdown, Gender Diversity, State Coverage, Avg Attendance), and sort options (Name, Best/Worst Attendance). MPs have color-coded attendance displays.
- **MP Profile Page**: Detailed individual MP information including:
    - Monthly and yearly allowance calculations, showing total earned and year-by-year breakdowns.
    - Attendance section with color-coded days attended out of total sitting days.
    - Comprehensive "Allowance Information" table displaying base MP allowance, minister salary (if applicable), entertainment allowance, handphone allowance, parliament sitting attendance allowance, computer allowance, and dress wear allowance.
    - "Court Cases" section for ongoing and completed legal proceedings with status badges, filing dates, charges, and document links.
    - "SPRM Investigations" section for ongoing and completed investigations with status badges, case numbers, start dates, charges, and outcomes.
- **Parliamentary Activity Page**: Browse legislative proposals, debate participations, parliamentary questions, court cases, and SPRM investigations with search and filters.
- **Hansard Records Page**: Browse parliamentary session transcripts and proceedings with:
    - Search by session number, topic, speaker, or content
    - Filter by session number
    - Collapsible sections for speakers list (with MP links), vote records, and full transcripts
    - Official PDF document links
    - Topics discussed displayed as badges
    - Vote tallies and results
    - "View by Constituency" dialog showing attended/absent constituencies grouped by state with party breakdown
- **MP Attendance Report Page**: Track which MPs and constituencies did not participate in parliamentary sessions:
    - Filter by date range, party, and state
    - View attendance statistics: Total Sessions, Average MPs Absent, Average Attendance Rate, MPs Tracked
    - Toggle between "By MP" and "By Constituency" views
    - By MP view: Shows collapsible session cards with absent MP lists and details
    - By Constituency view: Shows constituency-level attendance breakdown grouped by state for each session
- **State Management**: Server state managed by TanStack Query; local UI state by React hooks.

### Backend Architecture

**Framework**:
- Express.js with TypeScript (ESM modules)

**Data Layer**:
- In-memory storage (MemStorage) for development with automatic seed data.
- Drizzle ORM schema definitions ready for PostgreSQL migration.
- DbStorage class available for PostgreSQL deployment via Neon serverless driver.
- All CRUD operations work consistently across both storage implementations.

**API Design (RESTful)**:
- **MPs**: `GET /api/mps`, `GET /api/mps/:id` (includes attendance data).
- **Statistics**: `GET /api/stats` (party, gender, state, attendance rate).
- **Court Cases**: `GET /api/court-cases`, `GET /api/mps/:id/court-cases`, `GET /api/court-cases/:id`, `POST /api/court-cases`, `PATCH /api/court-cases/:id`, `DELETE /api/court-cases/:id`.
- **SPRM Investigations**: `GET /api/sprm-investigations`, `GET /api/mps/:id/sprm-investigations`, `GET /api/sprm-investigations/:id`, `POST /api/sprm-investigations`, `PATCH /api/sprm-investigations/:id`, `DELETE /api/sprm-investigations/:id`.
- **Hansard Records**: 
  - `GET /api/hansard-records/search?query=&startDate=&endDate=&sessionNumber=` (server-side search with filters)
  - `GET /api/hansard-records` (all records)
  - `GET /api/hansard-records/:id` (single record)
  - `GET /api/hansard-records/:id/constituency-attendance` (constituency-level attendance breakdown by state)
  - `GET /api/hansard-records/session/:sessionNumber` (by session)
  - `POST /api/hansard-records`, `PATCH /api/hansard-records/:id`, `DELETE /api/hansard-records/:id`

**Hansard Scraper**:
- Web scraper utility (`server/hansard-scraper.ts`) downloads PDFs from https://www.parlimen.gov.my/hansard-dewan-rakyat.html
- Automatically paginates through all available pages to fetch complete Parliament 15 dataset
- Extracts full text from PDFs using pdf-parse library
- Batch scraping command: `tsx server/scrape-hansard.ts` downloads up to 20 Hansard records
- Stores full transcript text, PDF links, topics, speakers, and vote records in database
- 2-second delay between requests to be respectful to parliament.gov.my servers

**Development & Production**:
- Vite dev server with HMR for rapid development.
- Frontend built to `dist/public`, backend bundled with esbuild to `dist/index.js` for production.
- In-memory storage for development ensures fast iteration without database setup complexity.
- Production can use DbStorage with PostgreSQL for persistent data storage.

### Data Models

**MP Schema**:
- Core details: `id`, `name`, `photoUrl`, `party`, `parliamentCode`, `constituency`, `state`, `gender`, `title`, `role`, `swornInDate`.
- Financial: `mpAllowance`, `ministerSalary`, `entertainmentAllowance`, `handphoneAllowance`, `parliamentSittingAllowance`, `computerAllowance`, `dressWearAllowance`.
- Performance: `daysAttended`, `totalParliamentDays`.

**User Schema**:
- `id`, `username`, `password` (authentication schema defined, not yet fully implemented).

**Court Case Schema**:
- `id`, `mpId`, `caseNumber`, `title`, `courtLevel`, `status`, `filingDate`, `outcome`, `charges`, `documentLinks`.

**SPRM Investigation Schema**:
- `id`, `mpId`, `caseNumber`, `title`, `status`, `startDate`, `endDate`, `outcome`, `charges`.

**Hansard Record Schema**:
- `id`, `sessionNumber`, `sessionDate`, `parliamentTerm`, `sitting`, `transcript`, `pdfLinks`, `topics`, `speakers` (array of MP ID, name, speaking order, duration), `voteRecords` (array of vote type, motion, result, counts), `createdAt`.

## External Dependencies

### Core Frameworks
- **React**: UI library.
- **Express**: Backend web framework.
- **TypeScript**: Full-stack type safety.
- **Vite**: Build tool and dev server.

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit.
- **Neon Serverless**: PostgreSQL database connection.
- **Drizzle Kit**: Database migration tool.
- **Drizzle Zod**: Schema validation integration.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-styled component implementations.
- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.
- **Embla Carousel**: Carousel functionality.

### Data & State Management
- **TanStack Query**: Server state management.
- **React Hook Form**: Form state and validation.
- **Zod**: Runtime schema validation.
- **@hookform/resolvers**: Form validation integration.

### Utilities
- **clsx** & **tailwind-merge**: CSS class management.
- **date-fns**: Date manipulation.
- **Wouter**: Lightweight routing.
- **Lucide React**: Icon library.

### Development Tools
- **Replit Plugins**: Development banner, cartographer, runtime error overlay.
- **PostCSS**: CSS processing.
- **esbuild**: Backend bundling.

### Session & Authentication
- **connect-pg-simple**: PostgreSQL session store (schema defined, not fully implemented).

## Deployment & Troubleshooting

### Railway Deployment

When deploying to Railway or other cloud platforms, the application automatically seeds the database on first startup if `DATABASE_URL` is configured. 

**✅ Automatic Fix for Stale Data**: The application now automatically detects Hansard records with `null` or `undefined` `absentMpIds` (stale data from before attendance tracking was added) and reseeds them with correct attendance data. Note: Empty arrays `[]` are preserved as they represent valid sessions with perfect attendance. Simply trigger a redeploy or restart your Railway application, and the seeding will fix itself.

However, if attendance data is still not showing up properly, follow these manual troubleshooting steps:

#### Verifying Database State

Check if your database has been properly seeded:

```bash
curl -H "X-Admin-Token: YOUR_ADMIN_TOKEN" https://your-app.railway.app/api/admin/db-status
```

This will return JSON showing:
- Total MPs in database
- Total Hansard records
- Number of records with absent MP data
- Sample records with attendance information

#### Manual Database Seeding

If the database is empty or missing attendance data, trigger a manual seed:

```bash
curl -X POST -H "X-Admin-Token: YOUR_ADMIN_TOKEN" https://your-app.railway.app/api/admin/seed
```

**Security Note**: Both admin endpoints require the `ADMIN_TOKEN` environment variable to be set. Generate a secure random token and add it to your Railway environment variables:

```bash
# Generate a secure token (example)
openssl rand -hex 32

# Add to Railway environment variables
ADMIN_TOKEN=your_generated_token_here
```

This endpoint will:
1. Seed all 222 MPs
2. Seed court cases and SPRM investigations
3. Seed Hansard records with attendance tracking
4. Return statistics confirming successful seeding

#### Common Issues

**Issue**: Attendance report shows "0 MPs absent" even though sessions exist

**Cause**: Database was not properly seeded with Hansard attendance data (`absentMpIds` and `attendedMpIds` arrays)

**Solution**: 
1. Check `/api/admin/db-status` to verify data state
2. Run `/api/admin/seed` to trigger manual seeding
3. Verify logs show "Seeding Hansard DR.XX.XX.XXXX: N absent MPs, M attended MPs"

**Note**: The seeding process is idempotent - it checks for existing data and only seeds what's missing.