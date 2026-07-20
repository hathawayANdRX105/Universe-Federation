<!--
agent/01-dev-workflow.md · agent/03-pr-guide.md
one PR = one Issue · no push to main · clean tree
-->

## What

<!-- What changes after merge? Concrete bullets OK. -->

## Why

<!-- Motivation / root cause. -->

## Issue

Fixes #

## How to test

1.

```text
# commands run, if any
```

## Checklist

- [ ] Exactly one Issue (`Fixes #N`)
- [ ] No secrets, real config, or junk files
- [ ] Tested (steps above) or explained why not

<!--
=== Extra sections (copy a block into the PR body only when it applies) ===
Do not leave empty “optional” headings in the PR. Headings below are plain names.

## Screenshots
When: UI/UX change a reviewer cannot verify from the diff alone.
- Before:
- After:

## Risk
When: migrations, data shape changes, hard-to-revert behavior, security-sensitive paths.
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
