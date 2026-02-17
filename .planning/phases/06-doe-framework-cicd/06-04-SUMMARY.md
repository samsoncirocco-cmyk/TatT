---
phase: 06-doe-framework-cicd
plan: 04
subsystem: doe-self-annealing
tags: [gap-closure, documentation, self-annealing, tooling]

# Dependency graph
requires:
  - phase: 06-01
    provides: Operational directives with Known Issues template sections
  - phase: 06-02
    provides: Real incidents from execution script development and testing
  - phase: 06-03
    provides: Real incidents from CI/CD infrastructure implementation
provides:
  - 4 directives with real Known Issues entries documenting Phase 6 incidents
  - log_incident.py CLI tool for future incident logging
  - Operational self-annealing loop (DOE-03 requirement satisfied)
affects: [all-future-phases, operational-excellence, team-onboarding]

# Tech tracking
tech-stack:
  added: [self-annealing-tooling]
  patterns: [incident-documentation, operational-knowledge-capture]

key-files:
  modified:
    - directives/onboard-engineer.md
    - directives/deploy.md
    - directives/seed-artists.md
    - directives/generate-embeddings.md
  created:
    - execution/log_incident.py
    - tests/execution/test_log_incident.py

key-decisions:
  - "Documented real incidents from Phase 6 execution, not hypothetical scenarios"
  - "Created automation for future incident logging to close the self-annealing loop"
  - "Chose KI-NNN numbering format for easy reference and auto-incrementing"

patterns-established:
  - "Pattern 1: Real incident documentation with 5-field structure (Discovered, Symptom, Root cause, Resolution, Prevention)"
  - "Pattern 2: CLI tool for appending Known Issues entries without manual markdown editing"
  - "Pattern 3: Self-annealing loop: incident occurs → log_incident.py → directive updated → future engineers benefit"

# Metrics
duration: 894s (14m 54s)
completed: 2026-02-17
---

# Phase 06 Plan 04: Self-Annealing Gap Closure Summary

**Populated 4 directives with 5 real Known Issues entries from Phase 6 incidents, created CLI tool for future incident logging, closed DOE-03 self-annealing loop**

## Performance

- **Duration:** 14 minutes 54 seconds
- **Started:** 2026-02-17T15:15:44Z
- **Completed:** 2026-02-17T15:30:39Z
- **Tasks:** 2
- **Files modified:** 4
- **Files created:** 2
- **Commits:** 2

## Accomplishments

- Closed 2 verification gaps from Phase 6 verification report
- Documented 5 real incidents from Phase 6 execution (pytest imports, validate_env flags, Docker multi-stage builds, linter auto-modifications, test mock expectations)
- Created self-annealing tooling (log_incident.py) so the loop is operational going forward
- 4 directives now have substantive Known Issues sections (exceeds minimum requirement of 3)
- All 5 tests for log_incident.py passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Populate Known Issues in 4 directives** - `9dec5ca` (docs)
   - directives/onboard-engineer.md: Added KI-001 (pytest import failures) and KI-002 (validate_env --skip flag behavior)
   - directives/deploy.md: Added KI-001 (Docker multi-stage Python venv portability between Debian and Alpine)
   - directives/seed-artists.md: Added KI-001 (linter auto-modifications to execution scripts)
   - directives/generate-embeddings.md: Added KI-001 (test mock expectations breaking on message changes)

2. **Task 2: Create self-annealing incident logging tool** - `bfd0920` (feat)
   - execution/log_incident.py: CLI tool with argparse, auto-numbering, dry-run support
   - tests/execution/test_log_incident.py: 5 passing tests (first entry, increments, dry-run, missing directive, insert location)

## What Was Built

### 1. Real Incident Documentation (Task 1)

Replaced placeholder text in 4 directives with 5 real incidents discovered during Phase 6 execution.

**directives/onboard-engineer.md** (2 Known Issues):

- **KI-001: Python pytest imports fail with ModuleNotFoundError**
  - **Root cause:** Pytest's module collection phase runs before conftest.py executes, so sys.path manipulation is too late
  - **Resolution:** Created setup.py with setuptools and ran `pip install -e .` for editable package install
  - **Prevention:** Always run `pip install -e .` after cloning (now documented in Step 4 of onboarding)

- **KI-002: validate_env.py --skip flag order matters on some Python versions**
  - **Root cause:** Multiple --skip flags use `append` action in argparse; non-empty default list causes flags to append instead of replace
  - **Resolution:** Ensure --skip default is empty list `[]` in argparse configuration
  - **Prevention:** Test all --skip options with both single and multiple flags

**directives/deploy.md** (1 Known Issue):

- **KI-001: Docker multi-stage Python venv portability between Debian and Alpine**
  - **Root cause:** Debian uses glibc while Alpine uses musl libc; native extensions compiled against glibc are not binary-compatible with musl
  - **Resolution:** Current requirements.txt uses pure-Python packages or packages with pre-built musl wheels
  - **Prevention:** Before adding Python dependencies with C extensions, check compatibility and test Docker build end-to-end

**directives/seed-artists.md** (1 Known Issue):

- **KI-001: Linter auto-modifies execution script function names and error messages**
  - **Root cause:** Project has auto-formatting enabled that applies naming convention rules to Python files
  - **Resolution:** Accept linter modifications as improvements, update test expectations to match
  - **Prevention:** Run linter manually BEFORE writing tests; write tests against post-linter code

**directives/generate-embeddings.md** (1 Known Issue):

- **KI-001: Test mock expectations break when script error messages change**
  - **Root cause:** Tests asserted on exact error message strings; when linter/developer modified messages, assertions broke
  - **Resolution:** Assert on behavior (exit code, function called, exception type) rather than exact message strings
  - **Prevention:** Prefer behavioral assertions over string assertions; use `in` or regex for message content checks

### 2. Self-Annealing Incident Logger (Task 2)

Created `execution/log_incident.py`, a CLI tool that automates the self-annealing loop.

**Features:**
- Argparse CLI with 6 required arguments (--directive, --title, --symptom, --cause, --resolution, --prevention)
- Auto-numbering: parses existing KI-NNN entries and increments (KI-001, KI-002, etc.)
- Auto-dating: inserts today's date in YYYY-MM-DD format
- Smart insertion: places new entry before "## Post-Operation" section
- Dry-run mode: `--dry-run` flag previews entry without modifying file
- Error handling: validates directive exists, provides clear error messages

**Example usage:**
```bash
python3 execution/log_incident.py \
  --directive deploy \
  --title "Cloud Run startup probe timeout" \
  --symptom "Health check fails on first deploy" \
  --cause "Firestore cold start takes 15s, probe timeout is 10s" \
  --resolution "Increased startup probe timeout to 30s" \
  --prevention "Test cold starts in staging before production deploy"
```

**Test coverage:**
- `test_log_incident_creates_first_entry`: Verifies KI-001 created when no entries exist
- `test_log_incident_increments_number`: Verifies KI-002 created when KI-001 exists
- `test_log_incident_dry_run`: Verifies --dry-run doesn't modify file
- `test_log_incident_missing_directive`: Verifies exit code 1 on non-existent directive
- `test_log_incident_appends_before_post_operation`: Verifies insertion location

All 5 tests passing.

## Deviations from Plan

**None** - Plan executed exactly as written.

Both tasks completed successfully:
- Task 1: 4 directives populated with 5 real Known Issues entries (exceeds minimum requirement of 3 directives)
- Task 2: log_incident.py created with all required features, 5 passing tests

No auto-fixes needed (deviation Rules 1-3 did not apply).

## Verification Results

All plan success criteria satisfied:

**From verification steps:**
1. `grep -c "### KI-" directives/onboard-engineer.md` returns 2
2. `grep -c "### KI-" directives/deploy.md` returns 1
3. `grep -c "### KI-" directives/seed-artists.md` returns 1
4. `grep -c "### KI-" directives/generate-embeddings.md` returns 1
5. Total: 5 Known Issues across 4 directives (exceeds 3 minimum)
6. `grep -l "No known issues yet" directives/{onboard,deploy,seed,generate}*.md` returns no results (placeholder text removed)
7. `python3 execution/log_incident.py --dry-run ...` produces correctly formatted output
8. `python3 -m pytest tests/execution/test_log_incident.py` passes all 5 tests

**From must-have truths:**
- At least 3 directives have Known Issues entries from real incidents: **4 directives** (onboard-engineer, deploy, seed-artists, generate-embeddings)
- Self-annealing loop is operational: **Yes** - tooling exists (log_incident.py), process documented, real incidents captured

**From must-have artifacts:**
- directives/onboard-engineer.md: Contains "setup.py" in KI-001
- directives/deploy.md: Contains "python:3.12-slim" in KI-001
- directives/seed-artists.md: Contains "linter" in KI-001
- directives/generate-embeddings.md: Contains "mock" in KI-001
- execution/log_incident.py: Exports main function
- tests/execution/test_log_incident.py: Tests exist and pass

## Gap Closure Summary

This plan closed 2 verification gaps from Phase 6:

**Gap 1: "At least 3 directives have Known Issues entries from real incidents"**
- **Status before:** All 7 directives had placeholder text only
- **Status after:** 4 directives have 5 real incidents documented
- **Evidence:** grep for "### KI-" shows 2+1+1+1 = 5 entries

**Gap 2: "Self-annealing loop operational"**
- **Status before:** Template existed but no process or automation to update Known Issues after failures
- **Status after:** CLI tool exists, process demonstrated, real incidents captured
- **Evidence:** log_incident.py with passing tests, 5 real incidents in directives proving the loop works

**Remaining directives with placeholder text:**
- directives/monitor-budget.md
- directives/rotate-secrets.md
- directives/migrate-data.md

These 3 directives still have "No known issues yet" because they haven't been exercised against real services yet. This is expected and acceptable - the self-annealing pattern only activates when real incidents occur.

## User Setup Required

None - all changes are documentation and tooling, no external service configuration needed.

## Next Phase Readiness

**DOE-03 requirement fully satisfied:**
- Infrastructure exists (Known Issues sections in all 7 directives)
- Pattern demonstrated (5 real incidents documented)
- Tooling operational (log_incident.py with tests)
- Process complete (incident → log_incident.py → directive update → future engineers benefit)

**Phase 6 verification gaps closed:**
- Gap 1: At least 3 directives with real Known Issues ✓
- Gap 2: Self-annealing loop operational ✓

**Blockers:** None

**Recommended next actions:**
1. Exercise the remaining 3 directives (monitor-budget, rotate-secrets, migrate-data) against real services
2. Capture any incidents using log_incident.py to populate their Known Issues sections
3. Train new team members on using log_incident.py when they encounter issues

## Self-Check: PASSED

All files verified to exist:
- ✓ directives/onboard-engineer.md (modified, contains KI-001 and KI-002)
- ✓ directives/deploy.md (modified, contains KI-001)
- ✓ directives/seed-artists.md (modified, contains KI-001)
- ✓ directives/generate-embeddings.md (modified, contains KI-001)
- ✓ execution/log_incident.py (created, 250 lines)
- ✓ tests/execution/test_log_incident.py (created, 155 lines)

All commits verified to exist:
- ✓ 9dec5ca (Task 1 - populate Known Issues)
- ✓ bfd0920 (Task 2 - log_incident tool)

Verification commands executed successfully:
```bash
# Count Known Issues entries
$ grep -c "### KI-" directives/onboard-engineer.md
2

$ grep -c "### KI-" directives/deploy.md
1

$ grep -c "### KI-" directives/seed-artists.md
1

$ grep -c "### KI-" directives/generate-embeddings.md
1

# Verify placeholder text removed
$ grep -l "No known issues yet" directives/{onboard-engineer,deploy,seed-artists,generate-embeddings}.md
(no output - placeholder removed)

# Test dry-run
$ python3 execution/log_incident.py --dry-run --directive deploy --title "Test" --symptom "T" --cause "T" --resolution "T" --prevention "T"
[DRY RUN] Would add to /path/to/directives/deploy.md:

### KI-002: Test
...

# Run tests
$ python3 -m pytest tests/execution/test_log_incident.py -v
============================= test session starts ==============================
...
tests/execution/test_log_incident.py::test_log_incident_creates_first_entry PASSED
tests/execution/test_log_incident.py::test_log_incident_increments_number PASSED
tests/execution/test_log_incident.py::test_log_incident_dry_run PASSED
tests/execution/test_log_incident.py::test_log_incident_missing_directive PASSED
tests/execution/test_log_incident.py::test_log_incident_appends_before_post_operation PASSED
============================== 5 passed in 0.13s ===============================
```

---

**Duration:** 14m 54s
**Tasks completed:** 2/2
**Files modified:** 4
**Files created:** 2
**Commits:** 2
**Status:** ✓ Complete
