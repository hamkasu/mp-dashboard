# Railway Admin Reset Instructions

Your Railway deployment is failing because it needs admin credentials set up properly. Here's how to fix it:

## Step 1: Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the **Variables** tab
4. Add these two environment variables:

```
ADMIN_USERNAME=your-chosen-username
ADMIN_PASSWORD=your-secure-password
```

**Password Requirements:**
- At least 8 characters long
- Contains at least one uppercase letter
- Contains at least one lowercase letter  
- Contains at least one number
- Contains at least one special character

Example: `MySecure@Pass123`

## Step 2: Clear Existing Users from Database

1. In Railway dashboard, go to your **PostgreSQL** database
2. Click the **Data** tab
3. Click **Query** to open the SQL query interface
4. Copy and paste this SQL:

```sql
DELETE FROM users;
```

5. Click **Run Query** to execute

## Step 3: Redeploy

1. After setting the environment variables and clearing the users table, Railway will automatically redeploy
2. The application will create a new admin user with your specified credentials on startup
3. You can then login with your new username and password

## Alternative: Manual Database Reset via Railway CLI

If you prefer using the Railway CLI:

```bash
# Connect to your Railway database
railway connect postgres

# Then run:
DELETE FROM users;
```

## Verify Setup

After redeployment, check the deployment logs in Railway. You should see:
```
Creating admin user...
✅ Admin user created with username: your-chosen-username
```

Then try logging in with your new credentials!
