#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  create_execution_plan.sh --goal "<goal>" [--owner "<owner>"] [--treads "<list>"] --out <path>

Options:
  --goal   Required. Goal statement for the plan.
  --owner  Optional. Plan owner label. Default: codex
  --treads Optional. Comma-separated Codex tread names.
           Default: discovery,delivery,verification
  --out    Required. Output markdown file path.
EOF
}

goal=""
owner="codex"
treads_raw="discovery,delivery,verification"
out=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --goal)
      [[ $# -ge 2 ]] || { usage; exit 1; }
      goal="$2"
      shift 2
      ;;
    --owner)
      [[ $# -ge 2 ]] || { usage; exit 1; }
      owner="$2"
      shift 2
      ;;
    --treads)
      [[ $# -ge 2 ]] || { usage; exit 1; }
      treads_raw="$2"
      shift 2
      ;;
    --out)
      [[ $# -ge 2 ]] || { usage; exit 1; }
      out="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$goal" || -z "$out" ]]; then
  usage
  exit 1
fi

out_dir="$(dirname "$out")"
mkdir -p "$out_dir"

created_at="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

IFS=',' read -r -a treads <<< "$treads_raw"
tread_rows=""
for tread in "${treads[@]}"; do
  tread_trimmed="$(printf '%s' "$tread" | awk '{$1=$1; print}')"
  [[ -z "$tread_trimmed" ]] && continue
  tread_rows="${tread_rows}| ${tread_trimmed} | TODO objective | TODO owner | queued |\n"
done

if [[ -z "$tread_rows" ]]; then
  tread_rows="| discovery | TODO objective | TODO owner | queued |\n| delivery | TODO objective | TODO owner | queued |\n| verification | TODO objective | TODO owner | queued |\n"
fi

{
cat <<EOF
# Execution Plan

- Goal: $goal
- Owner: $owner
- Created: $created_at

## 1. Story and Scope
- User story: As a <user>, I want <capability>, so that <outcome>.
- [ ] Define acceptance criteria:
- [ ] Confirm definition of done:
- [ ] Confirm out-of-scope boundaries:
- [ ] Record assumptions:

## 2. Codex Tread Deployment
| Tread | Objective | Owner | Status |
| --- | --- | --- | --- |
EOF
printf "%b" "$tread_rows"
cat <<'EOF'

Checkpoint handoff format:
- [ ] Completed actions:
- [ ] Files touched/reserved:
- [ ] Blockers/dependencies:
- [ ] Next tread handoff:

## 3. Discovery
- [ ] Inspect current implementation files:
- [ ] Identify dependency edges and unknowns:
- [ ] Capture risks and rollback approach:

## 4. Implementation Sequence (XP)
- [ ] Task 1:
- [ ] Task 2:
- [ ] Task 3:
- [ ] Red step (failing test/check or explicit precondition):
- [ ] Green step (minimum fix):
- [ ] Refactor step (design cleanup without behavior drift):
- [ ] Pair-thinking note (navigator challenge and resolution):

## 5. Validation
- [ ] Command/check 1:
- [ ] Command/check 2:
- [ ] Manual verification notes:
- [ ] Acceptance criteria satisfied:

## 6. Delivery Report
- [ ] Changed files:
- [ ] Results:
- [ ] Remaining risks:
- [ ] Next action:
EOF
} > "$out"

echo "$out"
