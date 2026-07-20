<!--
agent/01-dev-workflow.md · agent/03-pr-guide.md
one PR = one Issue · no push to main · clean tree

REQUIRED below (always fill).
RECOMMENDED EXTRAS: copy a block from the bottom comment into the PR body only
when it applies. Use plain headings (## Screenshots) — never "## … (optional)".
-->

## What

<!-- REQUIRED: What changes after merge? Concrete bullets OK. -->

## Why

<!-- REQUIRED: Motivation / root cause. -->

## Issue

<!-- REQUIRED: exactly one primary Issue -->
Fixes #

## How to test

<!-- REQUIRED: steps a reviewer can follow -->
1.

```text
# commands run, if any
```

## Checklist

<!-- REQUIRED -->
- [ ] Exactly one Issue (`Fixes #N`)
- [ ] No secrets, real config, or junk files
- [ ] Tested (steps above) or explained why not

<!--
===========================================================================
RECOMMENDED EXTRAS — optional. Copy a whole section into the PR body only
when the "When:" line matches. Leave out sections that do not apply.
Do not leave empty extra headings in the PR.

## Screenshots
When: UI/UX change a reviewer cannot verify from the diff alone.
- Before:
- After:

## Risk
When: migrations, data-shape changes, hard-to-revert behavior, security-sensitive paths.
- Risk: low / medium / high
- Migration or config:
- Revert by reverting this PR? yes / no

## Changelog
When: user-facing behavior or API change that should appear in CHANGELOG.
-

## Notes for reviewers
When: non-obvious edge cases, intentional follow-ups (link Issues), or “please focus on X”.
-
===========================================================================
-->
