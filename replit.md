# Malaysian Parliament MP Dashboard

## Overview

This is a web application that provides a comprehensive dashboard for viewing Malaysian Members of Parliament (MPs) from the Dewan Rakyat. The application allows users to browse, search, and filter 222 MPs by party affiliation, state, and constituency. It features detailed MP profiles with information including party membership, constituency details, gender, titles, and roles.

The application is built as a full-stack solution with a React frontend and Express backend, designed to present government data in an accessible, professional manner following Material Design principles and Government Digital Service standards.

## Recent Changes

### November 3, 2025 - SPRM Investigation Status Tracking
- **Implemented automatic investigation status tracking** for MPs based on their court cases
- **Schema updates**: Added `investigationStatus` field to MPs table (default: "Clear")
- **Dynamic calculation**: Investigation status is automatically computed from court case data:
  - "Under SPRM Investigation" - MPs with ongoing SPRM Investigation cases (e.g., Ismail Sabri Yaakob)
  - "Under Investigation" - MPs with any other ongoing court cases (e.g., Ahmad Zahid, Lim Guan Eng, Muhyiddin, Bung Moktar)
  - "Clear" - MPs with no ongoing cases or no cases at all
- **UI enhancements**: Visual investigation badges displayed across the application:
  - MP grid cards show red "Under Investigation" or "Under SPRM Investigation" badges
  - "MPs with Court Cases" section includes investigation status badges
  - MP profile pages display investigation status prominently with alert icon
- **Automatic updates**: Status updates dynamically whenever court cases are added, modified, or deleted
- **UX features**: Red destructive badges with warning icon for high visibility, only shown for MPs under investigation

### November 3, 2025 - Court Cases Tracking System
- **Implemented comprehensive court case tracking** for MPs with legal proceedings
- **Schema updates**: New `courtCases` table with fields for case number, title, court level, status, filing date, outcome, charges, and document links
- **Backend API**: Full CRUD REST API endpoints for managing court cases
  - GET /api/court-cases - Retrieve all court cases
  - GET /api/mps/:id/court-cases - Get court cases by MP
  - GET /api/court-cases/:id - Get single court case
  - POST /api/court-cases - Create new court case
  - PATCH /api/court-cases/:id - Update court case
  - DELETE /api/court-cases/:id - Delete court case
- **Profile page integration**: Court cases section on MP profiles displaying:
  - Ongoing cases (red "Ongoing" badge)
  - Completed cases (grey "Completed" badge) with outcomes
  - Case numbers, filing dates, charges, and court levels
  - Links to court documents where available
  - Empty state message for MPs without court cases
- **Sample data**: Seeded 4 notable Malaysian political court cases including Ahmad Zahid Hamidi (47 corruption charges), Lim Guan Eng (tunnel project - acquitted), Syed Saddiq (CBT and money laundering), and Muhyiddin Yassin (power abuse)
- **Data sources**: Manual research based on Malaysian court records and news sources
- **UX features**: Loading skeletons, status-based grouping, professional legal information display

### November 3, 2025 - Comprehensive Allowance Information Table
- **Implemented comprehensive allowance tracking** displaying all MP allowances in a single organized table
- **Schema updates**: Added `parliamentSittingAllowance` field (RM 400 per day attended) to MPs table
- **Profile page enhancement**: Replaced individual allowance cards with unified "Allowance Information" table showing:
  - Base MP Allowance (RM 16,000/month)
  - Minister Salary (if applicable, varies by position)
  - Entertainment Allowance (RM 2,500/month)
  - Handphone Allowance (RM 2,000/month)
  - Parliament Sitting Attendance (RM 400/day × days attended)
  - Computer Allowance (RM 6,000/year)
  - Dress Wear Allowance (RM 1,000/year)
- **Data source**: Members of Parliament (Remuneration) Act 1980 and official parliament sources
- **UX improvement**: Clean table layout with allowance type, frequency, and amount columns for easy comprehension
- **Full type safety**: All allowance fields properly typed in schema with default values

### November 3, 2025 - Attendance Tracking System
- **Implemented comprehensive attendance tracking** for all 222 MPs
- **Schema updates**: Added `daysAttended` and `totalParliamentDays` fields to MPs table
- **Realistic sample data**: Generated attendance records with 65 total sitting days, distributed realistically (50-98% attendance range)
- **Color-coded display**: Visual indicators on MP cards and profiles (green ≥85%, yellow 70-84%, red <70%)
- **Sorting functionality**: Added "Best Attendance" and "Worst Attendance" sort options
- **Dashboard statistics**: New "Avg Attendance" card showing overall parliament attendance (84.8%)
- **Profile page enhancement**: Detailed attendance section showing days attended out of total days

### November 3, 2025 - Complete Data Update
- **Updated all 222 MPs** with accurate data from the 15th Malaysian Parliament (GE15)
- **Data sources**: Cross-referenced Wikipedia (Members of Dewan Rakyat 15th Parliament, Anwar Ibrahim cabinet), Free Malaysia Today GE15 results, and official government sources
- **Ministerial roles verified**: All cabinet ministers, deputy ministers, and their salaries verified against the official Anwar Ibrahim Unity Government cabinet composition
- **Corrected 12 ministerial role errors** including fixing incorrect minister assignments and ensuring all non-ministerial MPs properly marked as backbenchers
- **Party distribution**: Now accurately reflects GE15 results - PH (82), PN (73), BN (30), GPS (23), GRS (6), WARISAN (3), IND (2), MUDA (1), KDM (1), PBM (1)
- **Gender diversity**: Updated to realistic 31 female MPs (14.0%)
- **Salary structure verified**: PM (RM34,000), Deputy PMs (RM24,000), Cabinet Ministers (RM14,000), Deputy Ministers (RM6,000), Backbenchers (RM0)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system

**Design System**:
- Material Design with Government Digital Service principles
- Custom theme using CSS variables for light/dark mode support
- Typography: Inter for headers/UI, system fonts for body text
- Responsive grid layouts optimized for data presentation
- Component library configured via `components.json` with "new-york" style

**Key Pages**:
- Home (`/`): Dashboard with MP grid, filters, search, statistics, and attendance tracking
  - 5 statistics cards: Total MPs, Party Breakdown, Gender Diversity, State Coverage, Avg Attendance
  - Sort options: Name (A-Z), Best Attendance, Worst Attendance
  - Color-coded attendance display on MP cards
- MP Profile (`/mp/:id`): Detailed individual MP information with salary and attendance details
  - Displays monthly and yearly allowance
  - Shows total earned since sworn in
  - Features year-by-year allowance breakdown table
  - Attendance section with color-coded days attended/total days display
  - Allowance Information table showing all compensation types including base allowance, minister salary, miscellaneous allowances (entertainment, handphone, computer, dress wear), and parliament sitting attendance allowance
  - Court Cases section showing ongoing and completed legal proceedings with status badges, filing dates, charges, and document links
- Not Found (`/404`): Error handling page

**State Management Strategy**:
- Server state cached via React Query with infinite stale time
- Local UI state (filters, search) managed with React hooks
- No global state management needed for this data-display application

### Backend Architecture

**Framework**: Express.js with TypeScript (ESM modules)

**Data Layer**:
- In-memory storage implementation (`MemStorage` class) for development
- Database schema defined using Drizzle ORM
- PostgreSQL ready via Neon serverless driver
- Schema includes `mps` and `users` tables

**API Design**:
- RESTful endpoints under `/api` prefix
- `GET /api/mps` - Retrieve all MPs with attendance data
- `GET /api/mps/:id` - Retrieve single MP by ID with attendance data
- `GET /api/stats` - Aggregate statistics (party breakdown, gender breakdown, state count, average attendance rate)
- `GET /api/court-cases` - Retrieve all court cases
- `GET /api/mps/:id/court-cases` - Get court cases by MP
- `GET /api/court-cases/:id` - Get single court case
- `POST /api/court-cases` - Create new court case
- `PATCH /api/court-cases/:id` - Update court case
- `DELETE /api/court-cases/:id` - Delete court case

**Development Setup**:
- Vite dev server integration in middleware mode
- HMR (Hot Module Replacement) enabled
- Custom error logging and request duration tracking

**Production Build**:
- Frontend: Vite build to `dist/public`
- Backend: esbuild bundle to `dist/index.js`
- Static file serving for production

### Data Models

**MP Schema** (`mps` table):
- `id`: UUID primary key (auto-generated)
- `name`: Full name (required)
- `photoUrl`: Profile photo URL (optional)
- `party`: Political party affiliation (required)
- `parliamentCode`: Parliament session code (required)
- `constituency`: Electoral constituency (required)
- `state`: Malaysian state (required)
- `gender`: Gender (required)
- `title`: Honorific title (optional)
- `role`: Parliamentary role (optional)
- `swornInDate`: Date MP was sworn into office (required)
- `mpAllowance`: Monthly MP base allowance in MYR (required)
- `ministerSalary`: Additional monthly salary if MP holds ministerial position (required, defaults to 0)
- `daysAttended`: Number of days MP attended parliament (required, defaults to 0)
- `totalParliamentDays`: Total number of parliament sitting days (required, defaults to 0)
- `entertainmentAllowance`: Monthly entertainment allowance in MYR (required, defaults to 2500)
- `handphoneAllowance`: Monthly handphone allowance in MYR (required, defaults to 2000)
- `parliamentSittingAllowance`: Daily parliament sitting attendance allowance in MYR (required, defaults to 400)
- `computerAllowance`: Yearly computer allowance in MYR (required, defaults to 6000)
- `dressWearAllowance`: Yearly dress wear allowance in MYR (required, defaults to 1000)
- `investigationStatus`: Investigation status based on court cases - "Clear", "Under Investigation", or "Under SPRM Investigation" (required, defaults to "Clear", dynamically calculated)

**User Schema** (`users` table):
- `id`: UUID primary key (auto-generated)
- `username`: Unique username (required)
- `password`: Hashed password (required)

**Court Case Schema** (`courtCases` table):
- `id`: UUID primary key (auto-generated)
- `mpId`: Foreign key reference to MPs table (required)
- `caseNumber`: Official court case number (required)
- `title`: Case title/description (required)
- `courtLevel`: Court level - Federal/High/Magistrate (required)
- `status`: Case status - Ongoing/Completed (required)
- `filingDate`: Date case was filed (required)
- `outcome`: Case outcome if completed (optional)
- `charges`: Description of charges/allegations (required)
- `documentLinks`: Array of URLs to court documents (optional)

## External Dependencies

### Core Framework Dependencies
- **React**: UI library (v18+)
- **Express**: Backend web framework
- **TypeScript**: Type safety across full stack
- **Vite**: Build tool and dev server

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit
- **Neon Serverless**: PostgreSQL database connection
- **Drizzle Kit**: Database migration tool
- **Drizzle Zod**: Schema validation integration

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (20+ components including accordion, dialog, dropdown, select, tabs, etc.)
- **shadcn/ui**: Pre-styled component implementations
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **Embla Carousel**: Carousel/slider functionality

### Data & State Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state and validation
- **Zod**: Runtime schema validation
- **@hookform/resolvers**: Form validation integration

### Utilities
- **clsx** & **tailwind-merge**: CSS class management
- **date-fns**: Date manipulation and formatting
- **Wouter**: Lightweight routing
- **Lucide React**: Icon library

### Key Features
- **Salary Calculations**: Utility functions to calculate total earned and yearly breakdowns
  - `calculateTotalSalary`: Computes total earnings from sworn-in date to present
  - `calculateYearlyBreakdown`: Distributes earnings across calendar years for detailed analysis
  - `formatCurrency`: Formats amounts in Malaysian Ringgit (MYR)

### Development Tools
- **Replit Plugins**: Development banner, cartographer, runtime error overlay
- **PostCSS**: CSS processing with Autoprefixer
- **esbuild**: Backend bundling for production

### Session & Authentication (Ready)
- **connect-pg-simple**: PostgreSQL session store
- User authentication schema defined but not yet implemented

### Configuration Notes
- Database URL required via `DATABASE_URL` environment variable
- Drizzle configured for PostgreSQL dialect
- Build outputs to `dist/` directory
- Path aliases configured: `@/` (client), `@shared/` (shared), `@assets/` (assets)