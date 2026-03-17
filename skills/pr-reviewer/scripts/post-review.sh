#!/usr/bin/env bash
set -euo pipefail

# post-review.sh — Post a review with inline comments to a GitHub PR
# Usage: post-review.sh <pr-number> [payload-file]

PR_NUMBER="${1:?Usage: post-review.sh <pr-number> [payload-file]}"
PAYLOAD="${2:-/tmp/pr-review/payload.json}"

# --- Validate payload exists ---
if [[ ! -f "$PAYLOAD" ]]; then
  echo "Error: Payload file not found: $PAYLOAD" >&2
  exit 1
fi

# --- Validate JSON structure ---
if ! jq empty "$PAYLOAD" 2>/dev/null; then
  echo "Error: Invalid JSON in $PAYLOAD" >&2
  exit 1
fi

# Verify required fields
if ! jq -e '.event' "$PAYLOAD" >/dev/null 2>&1; then
  echo "Error: Payload missing 'event' field" >&2
  exit 1
fi
if ! jq -e '.body' "$PAYLOAD" >/dev/null 2>&1; then
  echo "Error: Payload missing 'body' field" >&2
  exit 1
fi

# --- Resolve repo ---
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
if [[ -z "$REPO" ]]; then
  echo "Error: Could not determine repository. Are you in a git repo?" >&2
  exit 1
fi

echo "Posting review to ${REPO} PR #${PR_NUMBER}..."

# --- Post review ---
RESPONSE=$(gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
  --input "$PAYLOAD")

# --- Extract and print review URL ---
REVIEW_URL=$(echo "$RESPONSE" | jq -r '.html_url // empty')
if [[ -n "$REVIEW_URL" ]]; then
  echo "Review posted: ${REVIEW_URL}"
else
  echo "Review posted successfully."
  echo "$RESPONSE" | jq -r '.id // empty' | xargs -I{} echo "Review ID: {}"
fi

# --- Clean up payload ---
rm -f "$PAYLOAD"
echo "Cleaned up $PAYLOAD"
