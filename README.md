# MP Dashboard

A comprehensive dashboard for tracking Malaysian Members of Parliament (MPs), their activities, and parliamentary records.

## Features

- MP profiles with photos, party affiliations, and constituencies
- Parliamentary attendance tracking
- Hansard records and debate participation
- Legislative proposals and parliamentary questions
- Court cases and SPRM investigations
- Poverty data integration by constituency
- Admin authentication system

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Environment variables configured (see below)

### Environment Variables

Create a `.env` file with the following:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secret-key-change-in-production
NODE_ENV=production
```

### Installation

```bash
npm install
```

### Database Setup

The application uses Drizzle ORM for database management. On first deployment, the database schema will be automatically created.

#### Option 1: Automatic Setup (Recommended)

The `start` script automatically runs database migrations:

```bash
npm run build
npm start
```

This will:
1. Push the schema to the database using `drizzle-kit push`
2. Run any additional migrations
3. Import poverty data
4. Fix Hansard speaker IDs
5. Aggregate speech data
6. Start the application

#### Option 2: Manual Migration

If automatic setup fails, you can run migrations manually:

```bash
npm run db:migrate
```

### Creating an Admin User

After the database is set up, you need to create an admin user to access the admin panel.

#### Interactive Mode

```bash
npm run create-admin-user
```

This will prompt you for:
- Username
- Password
- Display Name
- Email (optional)

#### Using Environment Variables

You can also set environment variables to create an admin user non-interactively:

```bash
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=securepassword \
ADMIN_DISPLAY_NAME="Admin User" \
ADMIN_EMAIL=admin@example.com \
npm run create-admin-user
```

## Troubleshooting

### Error: relation "admin_users" does not exist

This error occurs when the database schema hasn't been properly initialized. To fix:

1. **Check DATABASE_URL**: Ensure your `DATABASE_URL` environment variable is correct and points to the right database.

2. **Run migrations manually**:
   ```bash
   npm run db:migrate
   ```

3. **Push schema directly**:
   ```bash
   npm run db:push
   ```

4. **Create an admin user**:
   ```bash
   npm run create-admin-user
   ```

### Error: column "co_sponsors" does not exist

This indicates the database schema is out of sync. Run:

```bash
npm run db:push
npm run db:migrate
```

### Cannot log in

1. Ensure you've created an admin user:
   ```bash
   npm run create-admin-user
   ```

2. Check that the user is active in the database:
   ```sql
   SELECT username, display_name, is_active FROM admin_users;
   ```

3. Verify the SESSION_SECRET is set in your environment variables.

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the development server with hot reloading.

### Database Commands

- `npm run db:push` - Push schema changes to the database
- `npm run db:migrate` - Run SQL migrations manually
- `npm run create-admin-user` - Create a new admin user

### Scripts

- `npm run backfill-speakers` - Backfill Hansard speaker data
- `npm run reprocess-hansard-pdfs` - Reprocess all Hansard PDFs
- `npm run batch-process-pdfs` - Batch process Hansard PDFs
- `npm run aggregate-speeches` - Aggregate speech data
- `npm run aggregate-constituency` - Aggregate constituency speech data
- `npm run fix-hansard-ids` - Fix Hansard speaker IDs

## Production Deployment

### Build

```bash
npm run build
```

This will:
1. Build the frontend with Vite
2. Bundle the server with esbuild
3. Bundle all scripts
4. Pre-render static pages

### Start

```bash
npm start
```

This will run all database migrations and start the production server.

## Architecture

- **Frontend**: React with Wouter for routing, TanStack Query for data fetching
- **Backend**: Express.js with Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: Session-based with bcrypt password hashing
- **File Storage**: PostgreSQL bytea for PDF files

## License

MIT
