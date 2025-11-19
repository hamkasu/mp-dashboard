# Railway Admin Access Configuration

## Your Admin Credentials

Set these environment variables in your Railway project to restrict admin access:

### Environment Variables to Set

1. **ADMIN_USERNAME**
   ```
   root
   ```

2. **ADMIN_PASSWORD**
   ```
   221097@aB1181098
   ```

## How to Set Environment Variables in Railway

### Step 1: Access Your Railway Project
1. Go to [railway.app](https://railway.app)
2. Select your Malaysian Parliament Dashboard project

### Step 2: Add Environment Variables
1. Click on your service (the main application)
2. Navigate to the **Variables** tab
3. Click **+ New Variable**

### Step 3: Add ADMIN_USERNAME
1. Variable name: `ADMIN_USERNAME`
2. Value: `root`
3. Click **Add**

### Step 4: Add ADMIN_PASSWORD
1. Click **+ New Variable** again
2. Variable name: `ADMIN_PASSWORD`
3. Value: `221097@aB1181098`
4. Click **Add**

### Step 5: Deploy
Railway will automatically redeploy your application with the new credentials.

## Verification

After deployment completes:

1. Navigate to your Railway app URL followed by `/login`
2. Enter the credentials:
   - Username: `root`
   - Password: `221097@aB1181098`
3. You should be logged in and able to access admin features

## Security Notes

✅ **Password Requirements Met:**
- Minimum 8 characters ✓
- Contains uppercase letters ✓
- Contains lowercase letters ✓
- Contains numbers ✓
- Contains special characters ✓

⚠️ **Important:**
- These credentials are ONLY for Railway (production)
- Development environment uses default credentials (admin/admin123)
- Sessions persist for 24 hours
- Sessions are stored securely in PostgreSQL

## Troubleshooting

### Cannot Login
- Verify variables are set correctly in Railway dashboard
- Check Railway deployment logs for "Admin user created with username: root"
- Ensure SESSION_SECRET is also set

### Need to Change Credentials
Simply update the environment variables in Railway and redeploy:
1. Go to Variables tab
2. Click on ADMIN_USERNAME or ADMIN_PASSWORD
3. Edit the value
4. Save (automatic redeploy)

### Reset Admin Access
If you need to reset the admin user:
1. Delete the admin user from database (via Railway's PostgreSQL console)
2. Redeploy - a new admin user will be created with your environment variables
