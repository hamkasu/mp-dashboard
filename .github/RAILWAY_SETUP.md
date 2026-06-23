# Railway Auto-Deployment Setup

This guide explains how to set up automatic deployments to Railway using GitHub Actions.

## Prerequisites

- A Railway account (https://railway.app)
- GitHub repository with this code
- Admin access to both Railway and GitHub

## Setup Steps

### 1. Get your Railway API Token

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your profile icon (top right) → **Account**
3. Scroll down to **API Tokens**
4. Click **Create New Token**
5. Give it a name like "GitHub Auto-Deploy"
6. Copy the token (you'll need it in the next step)

### 2. Add Railway Token to GitHub Secrets

1. Go to your GitHub repository
2. Settings → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `RAILWAY_TOKEN`
5. Value: Paste the token from step 1
6. Click **Add secret**

### 3. Verify the Workflow

1. Go to the **Actions** tab in your GitHub repository
2. You should see "Deploy to Railway" workflow listed
3. The workflow will automatically run on:
   - Every push to `main` or `master` branch
   - When you click **Run workflow** manually

### 4. How It Works

When you push code to the main branch:
1. GitHub Actions automatically triggers the deployment workflow
2. The workflow installs Railway CLI
3. Railway CLI uses your API token to authenticate
4. Code is deployed to your Railway service
5. You can track deployment status in the **Actions** tab

## Monitoring Deployments

### View Deployment Status in GitHub
- Go to **Actions** tab
- Click the latest workflow run
- View logs in real-time

### View Deployment Logs in Railway
- Go to Railway Dashboard
- Select your service
- Click **Deployments** tab
- View full logs for each deployment

## Manual Deployment (if needed)

If you want to deploy without waiting for a push:

1. Go to GitHub **Actions** tab
2. Select "Deploy to Railway"
3. Click **Run workflow**
4. Select environment (production/staging)
5. Click **Run workflow**

## Troubleshooting

### Deployment fails with "Invalid token"
- Verify the `RAILWAY_TOKEN` in GitHub Secrets is correct
- Check that the token hasn't expired in Railway Dashboard

### Deployment fails with "Service not found"
- Make sure the service name in the workflow matches your Railway service name
- Go to Railway Dashboard → your service → Settings → check the service name

### Changes not appearing after deployment
- Wait 2-3 minutes for the deployment to complete
- Check Railway Dashboard for any build errors
- View the deployment logs in both GitHub Actions and Railway

## Auto-Regenerate Report Cards

The Railway deployment will pick up the new ROI calculation code automatically. To regenerate report cards after deployment:

### Option 1: Wait for Monthly Schedule
- Report cards regenerate automatically on the 1st of every month at 2:00 AM (Malaysia Time)

### Option 2: Manual Trigger (requires admin access)
```bash
curl -X POST https://myparliament.calmic.com.my/api/admin/report-cards/update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 3: Add a Deployment Webhook
You can configure Railway to call the report card regeneration endpoint automatically after deployment. Contact your sysadmin to set this up.

## Next Steps

After setting up auto-deployment:

1. **Test it**: Make a small code change, push to main, and verify deployment in Actions tab
2. **Monitor**: Set up GitHub notifications for workflow failures
3. **Document**: Update your team on the new deployment process
4. **Optimize**: Adjust workflow based on your deployment frequency and needs

For more information, visit:
- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
