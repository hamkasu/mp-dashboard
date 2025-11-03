# Malaysian Parliament MP Dashboard

## Overview

This web application provides a comprehensive dashboard for Malaysian Members of Parliament (MPs) from the Dewan Rakyat. It enables users to browse, search, and filter 222 MPs by party, state, and constituency. The application features detailed MP profiles, including party affiliation, constituency, gender, titles, roles, attendance records, allowance information, and tracks court cases and Malaysian Anti-Corruption Commission (SPRM) investigations. The project aims to present government data in an accessible, professional manner, adhering to Material Design principles and Government Digital Service standards.

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
- **State Management**: Server state managed by TanStack Query; local UI state by React hooks.

### Backend Architecture

**Framework**:
- Express.js with TypeScript (ESM modules)

**Data Layer**:
- In-memory storage for development.
- Drizzle ORM for database schema definition.
- PostgreSQL ready via Neon serverless driver.

**API Design (RESTful)**:
- **MPs**: `GET /api/mps`, `GET /api/mps/:id` (includes attendance data).
- **Statistics**: `GET /api/stats` (party, gender, state, attendance rate).
- **Court Cases**: `GET /api/court-cases`, `GET /api/mps/:id/court-cases`, `GET /api/court-cases/:id`, `POST /api/court-cases`, `PATCH /api/court-cases/:id`, `DELETE /api/court-cases/:id`.
- **SPRM Investigations**: `GET /api/sprm-investigations`, `GET /api/mps/:id/sprm-investigations`, `GET /api/sprm-investigations/:id`, `POST /api/sprm-investigations`, `PATCH /api/sprm-investigations/:id`, `DELETE /api/sprm-investigations/:id`.

**Development & Production**:
- Vite dev server with HMR.
- Frontend built to `dist/public`, backend bundled with esbuild to `dist/index.js` for production.

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