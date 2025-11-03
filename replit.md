# Malaysian Parliament MP Dashboard

## Overview

This is a web application that provides a comprehensive dashboard for viewing Malaysian Members of Parliament (MPs) from the Dewan Rakyat. The application allows users to browse, search, and filter 222 MPs by party affiliation, state, and constituency. It features detailed MP profiles with information including party membership, constituency details, gender, titles, and roles.

The application is built as a full-stack solution with a React frontend and Express backend, designed to present government data in an accessible, professional manner following Material Design principles and Government Digital Service standards.

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
- Home (`/`): Dashboard with MP grid, filters, search, and statistics
- MP Profile (`/mp/:id`): Detailed individual MP information with salary breakdown
  - Displays monthly and yearly allowance
  - Shows total earned since sworn in
  - Features year-by-year allowance breakdown table
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
- `GET /api/mps` - Retrieve all MPs
- `GET /api/mps/:id` - Retrieve single MP by ID
- `GET /api/stats` - Aggregate statistics (party breakdown, gender breakdown, state count)

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

**User Schema** (`users` table):
- `id`: UUID primary key (auto-generated)
- `username`: Unique username (required)
- `password`: Hashed password (required)

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