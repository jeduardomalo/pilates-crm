#!/usr/bin/env bash
# Adds GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel production.
# Usage:
#   Option A: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env, then run:
#     ./scripts/setup-google-vercel-env.sh
#   Option B: Pass as arguments (avoid storing secret in .env):
#     ./scripts/setup-google-vercel-env.sh "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"

set -e
cd "$(dirname "$0")/.."

REDIRECT_URI="https://pilates-crm.vercel.app/api/google/auth/callback"

if [ -n "$2" ]; then
  GOOGLE_CLIENT_ID="$1"
  GOOGLE_CLIENT_SECRET="$2"
elif [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^GOOGLE_CLIENT_ID=' | xargs)
  export $(grep -v '^#' .env | grep -E '^GOOGLE_CLIENT_SECRET=' | xargs)
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID#*=}"
  GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET#*=}"
  GOOGLE_CLIENT_ID=$(echo "$GOOGLE_CLIENT_ID" | tr -d '"' | tr -d "'")
  GOOGLE_CLIENT_SECRET=$(echo "$GOOGLE_CLIENT_SECRET" | tr -d '"' | tr -d "'")
fi

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET."
  echo ""
  echo "1. Create OAuth credentials: https://console.cloud.google.com/apis/credentials"
  echo "   - Create OAuth 2.0 Client ID (Web application)"
  echo "   - Authorized redirect URI: $REDIRECT_URI"
  echo "2. Then run either:"
  echo "   - Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env and run: ./scripts/setup-google-vercel-env.sh"
  echo "   - Or: ./scripts/setup-google-vercel-env.sh \"YOUR_CLIENT_ID\" \"YOUR_CLIENT_SECRET\""
  exit 1
fi

echo "Adding Google Calendar env vars to Vercel production..."
echo -n "$REDIRECT_URI" | npx vercel env add GOOGLE_REDIRECT_URI production -y 2>/dev/null || true
echo -n "$GOOGLE_CLIENT_ID" | npx vercel env add GOOGLE_CLIENT_ID production -y
echo -n "$GOOGLE_CLIENT_SECRET" | npx vercel env add GOOGLE_CLIENT_SECRET production -y --sensitive
echo "Done. Redeploy (e.g. npx vercel --prod --yes or push a commit) for the new env vars to take effect."
