#!/usr/bin/env bash
# Install frontend-performance-agent and verify prerequisites
set -e

# Check Node >= 18
NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "fail")
if [ "$NODE_VER" = "fail" ]; then
  echo "❌ Node.js 18+ required. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# Check Chrome
if ! command -v google-chrome &>/dev/null && ! command -v chromium &>/dev/null && \
   ! [ -d "/Applications/Google Chrome.app" ]; then
  echo "⚠️  Chrome not found — Lighthouse needs it. Install from https://chrome.google.com"
fi
echo "✅ Chrome detected"

# Check GROQ_API_KEY
if [ -z "$GROQ_API_KEY" ]; then
  echo "⚠️  GROQ_API_KEY not set. Get a free key at https://console.groq.com"
  echo "   Then run: export GROQ_API_KEY=gsk_..."
else
  echo "✅ GROQ_API_KEY set"
fi

# Install
echo ""
echo "📦 Installing frontend-performance-agent..."
npm install -g frontend-performance-agent

echo ""
echo "✅ Done! Run: perf-agent-groq --prod"
