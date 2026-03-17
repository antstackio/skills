#!/usr/bin/env bash
set -euo pipefail

# fetch-pr.sh — Gather all PR data into /tmp/pr-review/ for analysis
# Usage: fetch-pr.sh <pr-number-or-url>

OUTDIR="/tmp/pr-review"

# --- Parse input ---
INPUT="${1:?Usage: fetch-pr.sh <pr-number-or-url>}"

# Extract PR number from URL or raw input
if [[ "$INPUT" =~ /pull/([0-9]+) ]]; then
  PR_NUMBER="${BASH_REMATCH[1]}"
elif [[ "$INPUT" =~ ^#?([0-9]+)$ ]]; then
  PR_NUMBER="${BASH_REMATCH[1]}"
else
  echo "Error: Cannot parse PR number from '$INPUT'" >&2
  exit 1
fi

# --- Verify gh auth ---
if ! gh auth status &>/dev/null; then
  echo "Error: gh CLI is not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi

# --- Prepare output directory ---
rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"
: > "$OUTDIR/scratchpad.md"

echo "Fetching PR #${PR_NUMBER}..."

# --- Parallel fetches ---
# PR metadata
gh pr view "$PR_NUMBER" --json title,body,author,baseRefName,headRefName,additions,deletions,changedFiles,url,number \
  > "$OUTDIR/metadata.json" &
PID_META=$!

# Full diff
gh pr diff "$PR_NUMBER" \
  > "$OUTDIR/diff.txt" &
PID_DIFF=$!

# Changed file list
gh pr diff "$PR_NUMBER" --name-only \
  > "$OUTDIR/changed-files.txt" &
PID_FILES=$!

# Existing review comments
gh pr view "$PR_NUMBER" --comments --json comments \
  > "$OUTDIR/comments.txt" &
PID_COMMENTS=$!

# PR template (check 4 common locations)
{
  for tmpl in .github/pull_request_template.md \
              .github/PULL_REQUEST_TEMPLATE.md \
              docs/pull_request_template.md \
              PULL_REQUEST_TEMPLATE.md; do
    if [[ -f "$tmpl" ]]; then
      cp "$tmpl" "$OUTDIR/pr-template.md"
      break
    fi
  done
  # Create empty file if no template found
  if [[ ! -f "$OUTDIR/pr-template.md" ]]; then
    echo "NO_PR_TEMPLATE" > "$OUTDIR/pr-template.md"
  fi
} &
PID_TMPL=$!

# --- Wait for all fetches ---
FAIL=0
for PID in $PID_META $PID_DIFF $PID_FILES $PID_COMMENTS $PID_TMPL; do
  wait "$PID" || FAIL=1
done

if [[ $FAIL -ne 0 ]]; then
  echo "Error: One or more fetches failed. Check output in $OUTDIR" >&2
  exit 1
fi

# --- Print summary ---
TITLE=$(jq -r '.title' "$OUTDIR/metadata.json")
ADDITIONS=$(jq -r '.additions' "$OUTDIR/metadata.json")
DELETIONS=$(jq -r '.deletions' "$OUTDIR/metadata.json")
FILE_COUNT=$(wc -l < "$OUTDIR/changed-files.txt" | tr -d ' ')

echo ""
echo "PR #${PR_NUMBER}: ${TITLE}"
echo "   +${ADDITIONS} / -${DELETIONS} lines across ${FILE_COUNT} files"
echo "   Data saved to ${OUTDIR}/"
echo ""
echo "Files created:"
ls -1 "$OUTDIR/"
