#!/bin/bash

# Railway Deployment Script
# This script helps you deploy the authentication fix to Railway

echo "🚀 Deploying Authentication Fix to Railway"
echo "==========================================="
echo ""

# Step 1: Check for uncommitted changes
echo "📝 Step 1: Checking for uncommitted changes..."
if [[ -n $(git status -s) ]]; then
  echo "✓ Found uncommitted changes. Creating commit..."
  git add .
  git commit -m "Fix passport session serialization for Railway production

- Add proper error handling in serializeUser/deserializeUser
- Add type validation for user objects during serialization
- Improve logging for production debugging
- Handle edge cases: missing users, database errors
- Clear error messages for troubleshooting"
  echo "✓ Changes committed"
else
  echo "✓ No uncommitted changes found"
fi

echo ""
echo "📦 Step 2: Push to Railway..."
echo "Attempting to push to Railway remote..."

# Try to push to railway remote
if git remote | grep -q "railway"; then
  echo "✓ Found railway remote. Pushing..."
  git push railway main || git push railway master
  echo "✓ Code pushed to Railway!"
else
  echo "⚠️  No 'railway' git remote found."
  echo ""
  echo "Please push to your Railway-connected repository manually:"
  echo "  git push origin main  (if Railway is connected to GitHub)"
  echo "  OR"
  echo "  railway up  (if using Railway CLI)"
fi

echo ""
echo "✅ Code deployment initiated!"
echo ""
echo "=========================================="
echo "📋 NEXT STEPS - Complete these in Railway Dashboard:"
echo "=========================================="
echo ""
echo "1️⃣  SET ENVIRONMENT VARIABLES:"
echo "   Go to: Railway Dashboard → Your Service → Variables"
echo ""
echo "   Add these variables:"
echo "   ADMIN_USERNAME=admin"
echo "   ADMIN_PASSWORD=YourSecure@Pass123  (min 8 chars, uppercase, lowercase, number, special char)"
echo "   SESSION_SECRET=\$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
echo ""
echo "2️⃣  CLEAR OLD USER DATA:"
echo "   Go to: Railway Dashboard → PostgreSQL → Data → Query"
echo ""
echo "   Run this SQL:"
echo "   DELETE FROM users;"
echo ""
echo "3️⃣  VERIFY DEPLOYMENT:"
echo "   Go to: Railway Dashboard → Your Service → Deployments"
echo "   Check logs for:"
echo "   ✓ 'Creating admin user...'"
echo "   ✓ '✅ Admin user created with username: admin'"
echo "   ✓ 'Database seeded successfully'"
echo ""
echo "4️⃣  TEST LOGIN:"
echo "   Visit your Railway app URL"
echo "   Try logging in with your new credentials"
echo ""
echo "=========================================="
echo "Need help? Check RAILWAY_ADMIN_RESET.md for detailed instructions"
echo "=========================================="
