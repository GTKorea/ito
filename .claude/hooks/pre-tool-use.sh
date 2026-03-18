#!/bin/bash
# PreToolUse hook for ito project
# 1. Block file access outside project directory
# 2. Redirect .env writes to .env.example

set -euo pipefail

PROJECT_DIR="/Users/hjick/Documents/applications/krow-tools/ito-claude"
ALLOWED_ROOT="/Users/hjick/Documents/applications"
INPUT=$(cat)

TOOL_NAME="${TOOL_NAME:-}"

# Extract file paths from tool input based on tool type
extract_paths() {
  case "$TOOL_NAME" in
    Read|Edit|Write)
      echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | sed 's/.*: *"//;s/"$//' 2>/dev/null
      ;;
    Glob|Grep)
      echo "$INPUT" | grep -o '"path"\s*:\s*"[^"]*"' | sed 's/.*: *"//;s/"$//' 2>/dev/null
      ;;
    Bash)
      # Best-effort: extract paths that look like absolute paths from the command
      echo "$INPUT" | grep -o '"command"\s*:\s*"[^"]*"' | sed 's/.*: *"//;s/"$//' | grep -oE '/[A-Za-z0-9/_.\-]+' 2>/dev/null
      ;;
  esac
}

# Rule 1: Block access outside project directory
check_boundary() {
  local paths
  paths=$(extract_paths)

  if [ -z "$paths" ]; then
    return 0
  fi

  while IFS= read -r path; do
    [ -z "$path" ] && continue
    # Resolve to absolute path
    resolved=$(cd "$PROJECT_DIR" && realpath -m "$path" 2>/dev/null || echo "$path")

    # Read operations: allow anywhere under ALLOWED_ROOT (sibling folders)
    # Write operations: only allow within PROJECT_DIR
    if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
      if [[ "$resolved" != "$PROJECT_DIR"* ]]; then
        echo "BLOCKED: '$resolved' — 쓰기는 프로젝트 디렉토리 내에서만 가능합니다 ($PROJECT_DIR)"
        exit 2
      fi
    else
      if [[ "$resolved" != "$ALLOWED_ROOT"* ]]; then
        echo "BLOCKED: '$resolved' — 조회 범위를 벗어났습니다 ($ALLOWED_ROOT)"
        exit 2
      fi
    fi
  done <<< "$paths"
}

# Rule 2: Block .env writes, suggest .env.example
check_env_write() {
  if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    local file_path
    file_path=$(echo "$INPUT" | grep -o '"file_path"\s*:\s*"[^"]*"' | sed 's/.*: *"//;s/"$//' 2>/dev/null)

    if [ -n "$file_path" ]; then
      local basename
      basename=$(basename "$file_path")
      # Block writing to .env files (but allow .env.example, .env.local.example, etc.)
      if [[ "$basename" == ".env" || "$basename" == .env.* ]] && [[ "$basename" != *.example ]]; then
        echo "BLOCKED: .env 파일 직접 수정 금지. 대신 .env.example 파일에 작성하세요."
        exit 2
      fi
    fi
  fi
}

check_boundary
check_env_write

exit 0
