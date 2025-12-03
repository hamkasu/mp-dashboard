#!/bin/bash

# Railway PDF Analysis Runner
# This script runs the PDF analysis on Railway

echo "🚀 Running PDF Analysis on Railway..."
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo ""
fi

# Login if needed
echo "🔐 Checking Railway authentication..."
railway whoami || railway login

echo ""
echo "📊 Running analyze-stored-pdfs script..."
railway run npm run analyze-stored-pdfs

echo ""
echo "✅ Script execution completed!"
echo "   Refresh your browser to see the updated questioner and ministry columns."
