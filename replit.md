# Malaysian Parliament MP Dashboard

## Overview
This web application provides a comprehensive dashboard for Malaysian Members of Parliament (MPs) from the Dewan Rakyat. It enables users to browse, search, and filter 222 MPs by party, state, and constituency. The application features detailed MP profiles, including party affiliation, constituency, gender, titles, roles, attendance records, allowance information, and tracks court cases and Malaysian Anti-Corruption Commission (SPRM) investigations. The project aims to present government data in an accessible, professional manner, adhering to Material Design principles and Government Digital Service standards, with ambitions for market potential and an accessible platform for government transparency.

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