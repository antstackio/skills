#!/usr/bin/env bash
# Run perf-audit against a Next.js project
# Usage: ./run.sh [project-path] [--prod] [--dry-run] [--device mobile|desktop]
set -e

PROJECT=${1:-.}
shift 2>/dev/null || true

if ! command -v perf-agent-groq &>/dev/null; then
  echo "❌ perf-agent-groq not found. Run scripts/install.sh first."
  exit 1
fi

if [ -z "$GROQ_API_KEY" ]; then
  echo "❌ GROQ_API_KEY not set. Get a free key at https://console.groq.com"
  exit 1
fi

echo "🚀 Running perf-audit on: $PROJECT"
perf-agent-groq --project "$PROJECT" "$@"
