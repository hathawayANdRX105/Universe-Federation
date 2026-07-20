# AGENTS.md — Universe Federation

Instructions for **AI agents** and human contributors working in this repository.

## Read first (agent handbook)

| Doc | Purpose |
|-----|---------|
| [`agent/README.md`](agent/README.md) | Index of agent docs |
| [`agent/01-dev-workflow.md`](agent/01-dev-workflow.md) | **Issue → branch → dev → PR → CI → review** |
| [`agent/02-issue-guide.md`](agent/02-issue-guide.md) | How to open Issues (templates) |
| [`agent/03-pr-guide.md`](agent/03-pr-guide.md) | How to open PRs (templates) |

GitHub templates (forms members fill):

- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/task.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/pull_request_template.md`

## Hard rules

1. **No direct pushes to `main`.** Branch → PR → review → merge.
2. **One Issue = one PR.** PR body must include `Fixes #N` / `Closes #N`. Never pack multiple Issues into one PR.
3. **Issue first.** Discuss / file Issue before coding (except trivial typo with maintainer OK).
4. **Single assignee** per Issue. Help via comments / `help-wanted`, not dual ownership.
5. **Use templates.** Do not open blank free-form Issues when a template fits.
6. **Keep the tree clean.** No random dirs/files, no secrets, no real instance config, no local tooling DBs committed.
7. **Match existing style.** Misskey/Sharkey-derived tree; no drive-by renames or rebrands.

## Branch names

| Prefix | Use |
|--------|-----|
| `fix/<issue>-slug` | Bug |
| `feat/<issue>-slug` | Feature |
| `refactor/<issue>-slug` | Behavior-preserving structure change |
| `chore/<issue>-slug` | CI / deps / tooling |
| `docs/<issue>-slug` | Docs only |

## Local agent tooling (optional)

- **bd (beads)** — agent-local task graph. Run `bd prime` when initialized.  
  - Do **not** use `bd q` for lookup (creates issues). Use `bd show` / `bd list` / `bd search`.  
  - Do **not** use `bd edit` (opens `$EDITOR`). Use `bd update`.  
  - Prefer readable IDs (`uf-m1`, `docs-handbook`, `dh-i2-implement`), not auto hash junk.
- **codegraph** — `codegraph init` → `.codegraph/` (gitignored).
- **code-review-graph** — `code-review-graph build` → `.code-review-graph/` (gitignored).

Never commit: `.beads/`, `.codegraph/`, `.code-review-graph/`, `.worktree/`.

## Before asking for review

- Diff matches **one** Issue scope.
- Workspace clean (no stray files/dirs).
- PR template checklist filled.
- CI on the PR green, or failures explained with a fix plan.

## Session close (agents)

1. Push branch; open/update PR with `Fixes #N`.
2. Update Issue / Project column if used.
3. If using bd: close/update beads with reason; do not leave work only in chat.
