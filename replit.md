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
-   **Home Dashboard**: MP grid, filters, search, statistics (Total MPs, Party Breakdown, Gender Diversity, State Coverage, Avg Attendance), sort options (Name, Best/Worst Attendance), color-coded attendance displays.
-   **MP Profile Page**: Detailed individual MP information, monthly/yearly allowance calculations, attendance section with color-coded days, allowance information table, court cases section with status badges, SPRM investigations section.
-   **Parliamentary Activity Page**: Browse legislative proposals, debate participations, parliamentary questions, court cases, and SPRM investigations with search and filters.
-   **Hansard Records Page**: Browse parliamentary session transcripts with search/filter, collapsible sections for speakers, vote records, full transcripts, PDF links, topics, vote tallies, and a "View by Constituency" dialog showing attendance grouped by state and party.
-   **MP Attendance Report Page**: Tracks MP and constituency participation; filter by date range, party, state; view attendance statistics; toggle between "By MP" and "By Constituency" views.
**State Management**: Server state by TanStack Query; local UI state by React hooks.

### Backend Architecture
**Framework**: Express.js with TypeScript (ESM modules).
**Data Layer**: In-memory storage (MemStorage) for development, Drizzle ORM for PostgreSQL with DbStorage for production (Neon serverless driver).
**API Design (RESTful)**: Endpoints for MPs, statistics, court cases, SPRM investigations, and Hansard records (including search, single record, and constituency attendance). Admin endpoints for database seeding and status (`/api/admin/seed`, `/api/admin/db-status`).
**Hansard Scraper**: Utility (`server/hansard-scraper.ts`) to download and extract PDFs from parlimen.gov.my, with automatic pagination and a 2-second delay between requests. Stores full transcript text, PDF links, topics, speakers, and vote records.
**Development & Production**: Vite dev server for frontend, esbuild for backend bundling. In-memory storage for dev, PostgreSQL for production.

### Data Models
**MP Schema**: Core details (`id`, `name`, `party`, `constituency`, `gender`, `role`, etc.), financial data (`mpAllowance`, `ministerSalary`, etc.), performance (`daysAttended`).
**User Schema**: `id`, `username`, `password` (authentication schema defined).
**Court Case Schema**: `id`, `mpId`, `caseNumber`, `title`, `courtLevel`, `status`, `filingDate`, `outcome`, `charges`, `documentLinks`.
**SPRM Investigation Schema**: `id`, `mpId`, `caseNumber`, `title`, `status`, `startDate`, `endDate`, `outcome`, `charges`.
**Hansard Record Schema**: `id`, `sessionNumber`, `sessionDate`, `parliamentTerm`, `transcript`, `pdfLinks`, `topics`, `speakers`, `voteRecords`.

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