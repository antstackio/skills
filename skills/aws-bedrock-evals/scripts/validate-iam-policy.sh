#!/usr/bin/env bash
# Validate an IAM policy JSON file for common security issues
# Usage: ./scripts/validate-iam-policy.sh <policy-file.json>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <policy-json-file>" >&2
  exit 1
fi

POLICY_FILE="$1"
WARNINGS=0

if [ ! -f "${POLICY_FILE}" ]; then
  echo "ERROR: File not found: ${POLICY_FILE}" >&2
  exit 1
fi

# Verify it's valid JSON
if ! jq empty "${POLICY_FILE}" 2>/dev/null; then
  echo "ERROR: Invalid JSON in ${POLICY_FILE}" >&2
  exit 1
fi

echo "Checking IAM policy: ${POLICY_FILE}"
echo "---"

# Check for wildcard resources
WILDCARD_RESOURCES=$(jq -r '
  .Statement[]
  | select(.Effect == "Allow")
  | .Resource
  | if type == "array" then .[] else . end
  | select(. == "*")
' "${POLICY_FILE}" 2>/dev/null || true)

if [ -n "${WILDCARD_RESOURCES}" ]; then
  echo "WARNING: Found wildcard '*' in Allow statement Resource" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Check for wildcard actions
WILDCARD_ACTIONS=$(jq -r '
  .Statement[]
  | select(.Effect == "Allow")
  | .Action
  | if type == "array" then .[] else . end
  | select(. == "*" or endswith(":*"))
' "${POLICY_FILE}" 2>/dev/null || true)

if [ -n "${WILDCARD_ACTIONS}" ]; then
  echo "WARNING: Found wildcard action in Allow statement: ${WILDCARD_ACTIONS}" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Check for missing conditions on sensitive actions
SENSITIVE_ACTIONS=("sts:AssumeRole" "bedrock:InvokeModel")
for action in "${SENSITIVE_ACTIONS[@]}"; do
  UNCONDITIONED=$(jq -r --arg action "${action}" '
    .Statement[]
    | select(.Effect == "Allow")
    | select(
        (.Action | if type == "array" then any(. == $action) else . == $action end)
        and (.Condition == null)
      )
    | .Sid // "unnamed"
  ' "${POLICY_FILE}" 2>/dev/null || true)

  if [ -n "${UNCONDITIONED}" ]; then
    echo "WARNING: Action '${action}' in statement '${UNCONDITIONED}' has no Condition" >&2
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Check for overly broad S3 actions
BROAD_S3=$(jq -r '
  .Statement[]
  | select(.Effect == "Allow")
  | .Action
  | if type == "array" then .[] else . end
  | select(. == "s3:*" or . == "s3:DeleteBucket" or . == "s3:PutBucketPolicy" or . == "s3:DeleteObject")
' "${POLICY_FILE}" 2>/dev/null || true)

if [ -n "${BROAD_S3}" ]; then
  echo "WARNING: Found dangerous S3 action in Allow statement: ${BROAD_S3}" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Check for explicit deny statements (good practice)
DENY_COUNT=$(jq '[.Statement[] | select(.Effect == "Deny")] | length' "${POLICY_FILE}" 2>/dev/null || echo "0")
if [ "${DENY_COUNT}" -eq 0 ]; then
  echo "INFO: No explicit Deny statements found. Consider adding deny rules for dangerous actions." >&2
fi

echo "---"
if [ "${WARNINGS}" -gt 0 ]; then
  echo "RESULT: ${WARNINGS} warning(s) found"
  exit 1
else
  echo "RESULT: No warnings — policy looks good"
  exit 0
fi
