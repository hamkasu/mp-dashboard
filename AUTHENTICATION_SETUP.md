# Authentication Setup for Admin Access

Password protection has been added to the Admin panel. Only authenticated users can access admin routes and features.

## Features

✅ **Protected Admin Routes** - All `/api/admin/*` endpoints require authentication  
✅ **Hidden Admin Menu** - Admin menu only shows when logged in  
✅ **Login/Logout Button** - Users can log in and out from the header  
✅ **Session-based Auth** - Uses PostgreSQL for persistent sessions (works on Railway)

## Creating an Admin Account

### On Replit (Development)

1. Start the application: `npm run dev`
2. Visit http://localhost:5000/auth
3. Create an account with a username and password
4. You'll be automatically logged in and can now access the Admin section

### On Railway (Production)

You have two options:

#### Option 1: Register via the Web Interface (Simplest)

1. Deploy your app to Railway
2. Visit `https://your-railway-app.railway.app/auth`
3. Register with your admin username and password
4. You'll be logged in and can access the Admin panel

#### Option 2: Seed an Admin User via API

You can create an admin user by calling the register endpoint directly:

```bash
curl -X POST https://your-railway-app.railway.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-secure-password-here"}'
```

## Environment Variables

### Required for Production

Set these environment variables in your Railway dashboard:

```
SESSION_SECRET=your-random-session-secret-here
DATABASE_URL=<provided-by-railway>
```

To generate a secure `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Notes

- ✅ Sessions are stored in PostgreSQL (persistent across deployments)
- ✅ Passwords are hashed using `scrypt` with random salts
- ✅ HttpOnly cookies prevent XSS attacks
- ✅ Sessions expire after 24 hours
- ⚠️ **Important**: Always use HTTPS in production for secure cookie transmission

## Testing the Setup

1. **Without login**: Visit the homepage - Admin menu should be hidden
2. **Login**: Click "Login" in the header → enter credentials
3. **After login**: Admin menu should appear in the navigation
4. **Access admin page**: Click "Admin" to access Hansard admin panel
5. **Logout**: Click "Logout" to end your session

## Troubleshooting

### "Unauthorized" Error on Admin Routes

- Make sure you're logged in (check if Admin menu is visible)
- Check browser console for session/cookie errors
- Verify `SESSION_SECRET` is set in production

### Can't Log In

- Verify username and password are correct
- Check database connection (sessions are stored in PostgreSQL)
- Make sure the `users` table exists in your database

### Sessions Not Persisting

- Ensure `DATABASE_URL` is properly set
- Check that PostgreSQL is accessible
- Verify the `session` table was created automatically
