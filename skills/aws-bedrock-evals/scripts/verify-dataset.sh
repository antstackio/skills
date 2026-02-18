#!/usr/bin/env bash
# Validate a JSONL dataset for Bedrock evaluation jobs
# Usage: ./scripts/verify-dataset.sh <dataset.jsonl>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <dataset.jsonl>" >&2
  exit 1
fi

DATASET_FILE="$1"
ERRORS=0
WARNINGS=0

if [ ! -f "${DATASET_FILE}" ]; then
  echo "ERROR: File not found: ${DATASET_FILE}" >&2
  exit 1
fi

TOTAL_LINES=$(wc -l < "${DATASET_FILE}" | tr -d ' ')
echo "Validating dataset: ${DATASET_FILE} (${TOTAL_LINES} lines)"
echo "---"

# Check each line is valid JSON with required fields
LINE_NUM=0
while IFS= read -r line; do
  LINE_NUM=$((LINE_NUM + 1))

  # Skip empty lines
  if [ -z "${line}" ]; then
    continue
  fi

  # Validate JSON
  if ! echo "${line}" | jq empty 2>/dev/null; then
    echo "ERROR: Line ${LINE_NUM}: Invalid JSON" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check required fields
  HAS_PROMPT=$(echo "${line}" | jq 'has("prompt")' 2>/dev/null)
  HAS_MODEL_RESPONSES=$(echo "${line}" | jq 'has("modelResponses")' 2>/dev/null)

  if [ "${HAS_PROMPT}" != "true" ]; then
    echo "ERROR: Line ${LINE_NUM}: Missing 'prompt' field" >&2
    ERRORS=$((ERRORS + 1))
  fi

  if [ "${HAS_MODEL_RESPONSES}" != "true" ]; then
    echo "ERROR: Line ${LINE_NUM}: Missing 'modelResponses' field" >&2
    ERRORS=$((ERRORS + 1))
  else
    RESPONSE_COUNT=$(echo "${line}" | jq '.modelResponses | length' 2>/dev/null)
    if [ "${RESPONSE_COUNT}" != "1" ]; then
      echo "WARNING: Line ${LINE_NUM}: Expected exactly 1 modelResponse, found ${RESPONSE_COUNT}" >&2
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # Check for boundary marker injection attempts in prompt/response fields
  BOUNDARY_MATCHES=$(echo "${line}" | jq -r '
    [.prompt // "", (.modelResponses[]?.response // ""), .referenceResponse // ""]
    | join("\n")
  ' 2>/dev/null | grep -c '--- \(BEGIN\|END\) UNTRUSTED' || true)

  if [ "${BOUNDARY_MATCHES}" -gt 0 ]; then
    echo "WARNING: Line ${LINE_NUM}: Contains boundary marker strings that may cause prompt injection" >&2
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check for control characters
  CONTROL_CHARS=$(echo "${line}" | jq -r '
    [.prompt // "", (.modelResponses[]?.response // "")]
    | join("")
  ' 2>/dev/null | grep -cP '[\x00-\x08\x0B\x0C\x0E-\x1F]' || true)

  if [ "${CONTROL_CHARS}" -gt 0 ]; then
    echo "WARNING: Line ${LINE_NUM}: Contains control characters — consider sanitizing" >&2
    WARNINGS=$((WARNINGS + 1))
  fi

done < "${DATASET_FILE}"

# Compute SHA-256 checksum
CHECKSUM=$(shasum -a 256 "${DATASET_FILE}" | cut -d' ' -f1)

echo "---"
echo "SHA-256: ${CHECKSUM}"
echo "Lines: ${TOTAL_LINES}"
echo "Errors: ${ERRORS}"
echo "Warnings: ${WARNINGS}"

if [ "${ERRORS}" -gt 0 ]; then
  echo "RESULT: FAILED — ${ERRORS} error(s) found"
  exit 1
elif [ "${WARNINGS}" -gt 0 ]; then
  echo "RESULT: PASSED with ${WARNINGS} warning(s)"
  exit 0
else
  echo "RESULT: PASSED — dataset is valid"
  exit 0
fi
