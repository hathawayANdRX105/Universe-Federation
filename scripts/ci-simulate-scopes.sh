#!/usr/bin/env bash
# Local simulation of path-conditional CI scopes (no GitHub Actions).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/scripts/ci-changed-scopes.py"

run_case() {
  local name="$1"; shift
  echo "=== CASE: $name ==="
  printf '%s\n' "$@" | python3 "$PY"
  echo
}

run_case "backend only" \
  packages/backend/src/core/NoteCreateService.ts \
  packages/backend/test/e2e/streaming.ts

run_case "frontend only" \
  packages/frontend/src/components/MkNote.vue

run_case "federation paths" \
  packages/backend/test-federation/compose.yml \
  packages/backend/src/core/activitypub/ApInboxService.ts

run_case "container only" \
  Dockerfile \
  compose.local-db.yml

run_case "lockfile widen (shared)" \
  pnpm-lock.yaml

run_case "CI config widen" \
  .github/workflows/medium-tests.yml \
  scripts/ci-changed-scopes.py

run_case "docs-only (no selective jobs)" \
  README.md \
  CONTRIBUTING.md

run_case "mixed backend+frontend" \
  packages/backend/src/foo.ts \
  packages/frontend/src/bar.ts

# Expected job map helper
echo "=== EXPECTED JOBS (from scopes) ==="
python3 - <<'PY'
import subprocess, json, textwrap, sys
from pathlib import Path
root = Path(__file__).resolve().parent if False else Path(".")
# use classifier via import
sys.path.insert(0, "scripts")
# call CLI
cases = {
  "backend only": ["packages/backend/src/x.ts"],
  "frontend only": ["packages/frontend/src/x.ts"],
  "federation": ["packages/backend/test-federation/a.ts"],
  "container": ["Dockerfile"],
  "lockfile": ["pnpm-lock.yaml"],
  "docs": ["README.md"],
}
import importlib.util
spec = importlib.util.spec_from_file_location("scopes", "scripts/ci-changed-scopes.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def jobs(s):
  out = ["detect-changes", "validation-gate", "PR Gate (always)"]
  if s["backend"]:
    out += ["backend-unit", "backend-typecheck", "backend-api-e2e"]
  if s["frontend"]:
    out += ["frontend-unit", "frontend-typecheck"]
  if s["federation"]:
    out += ["federation"]
  if s["container"]:
    out += ["container-smoke"]
  return out

for name, files in cases.items():
  s = mod.classify(files)
  print(f"{name}: scopes={s}")
  print(f"  run -> {jobs(s)}")
PY
