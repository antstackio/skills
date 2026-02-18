#!/usr/bin/env bash
# Input validation functions for aws-bedrock-evals
# Source this file: source ./scripts/validate-inputs.sh

set -euo pipefail

validate_region() {
  local region="${1:-}"
  if [[ ! "${region}" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ ]]; then
    echo "ERROR: Invalid AWS region: '${region}'" >&2
    echo "  Expected pattern: ^[a-z]{2}-[a-z]+-[0-9]+$ (e.g., us-east-1)" >&2
    return 1
  fi
}

validate_bucket_name() {
  local bucket="${1:-}"
  if [[ ! "${bucket}" =~ ^[a-z0-9][a-z0-9.\-]{1,61}[a-z0-9]$ ]]; then
    echo "ERROR: Invalid S3 bucket name: '${bucket}'" >&2
    echo "  Expected pattern: ^[a-z0-9][a-z0-9.\-]{1,61}[a-z0-9]$ (e.g., my-eval-bucket)" >&2
    return 1
  fi
}

validate_role_name() {
  local role="${1:-}"
  if [[ ! "${role}" =~ ^[a-zA-Z0-9+=,.@_-]+$ ]]; then
    echo "ERROR: Invalid IAM role name: '${role}'" >&2
    echo "  Expected pattern: ^[a-zA-Z0-9+=,.@_-]+$ (e.g., BedrockEvalRole)" >&2
    return 1
  fi
}

validate_job_name() {
  local job="${1:-}"
  if [[ ! "${job}" =~ ^[a-z0-9](-*[a-z0-9]){0,62}$ ]]; then
    echo "ERROR: Invalid job name: '${job}'" >&2
    echo "  Expected pattern: ^[a-z0-9](-*[a-z0-9]){0,62}$ (e.g., my-eval-20240101)" >&2
    return 1
  fi
}

validate_account_id() {
  local account="${1:-}"
  if [[ ! "${account}" =~ ^[0-9]{12}$ ]]; then
    echo "ERROR: Invalid AWS account ID: '${account}'" >&2
    echo "  Expected pattern: ^[0-9]{12}$ (e.g., 123456789012)" >&2
    return 1
  fi
}

validate_model_id() {
  local model="${1:-}"
  if [[ ! "${model}" =~ ^[a-zA-Z0-9.:_-]+$ ]]; then
    echo "ERROR: Invalid model ID: '${model}'" >&2
    echo "  Expected pattern: ^[a-zA-Z0-9.:_-]+$ (e.g., amazon.nova-pro-v1:0)" >&2
    return 1
  fi
}

# If run directly (not sourced), validate arguments passed on command line
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ $# -lt 2 ]; then
    echo "Usage: $0 <type> <value>" >&2
    echo "  Types: region, bucket_name, role_name, job_name, account_id, model_id" >&2
    exit 1
  fi

  case "$1" in
    region)       validate_region "$2" ;;
    bucket_name)  validate_bucket_name "$2" ;;
    role_name)    validate_role_name "$2" ;;
    job_name)     validate_job_name "$2" ;;
    account_id)   validate_account_id "$2" ;;
    model_id)     validate_model_id "$2" ;;
    *)
      echo "ERROR: Unknown validation type: '$1'" >&2
      exit 1
      ;;
  esac

  echo "OK: '$2' is a valid $1"
fi
