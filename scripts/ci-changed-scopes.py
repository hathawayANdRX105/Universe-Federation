#!/usr/bin/env python3
"""Classify changed paths into CI scopes for job-level if conditions.

Usage:
  git diff --name-only BASE...HEAD | python3 scripts/ci-changed-scopes.py
  python3 scripts/ci-changed-scopes.py --files a b c
  python3 scripts/ci-changed-scopes.py --github-output   # write GITHUB_OUTPUT

Scopes:
  backend    - packages/backend/**
  frontend   - frontend / frontend-embed / frontend-shared / sw / games
  federation - test-federation or ActivityPub paths
  container  - root Dockerfile/compose, .devcontainer, chart, docker/
  shared     - lockfile, root package, shared packages, CI/config/scripts
  all        - true when shared widens unit-level verification
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import PurePosixPath


def matches(path: str, prefixes: tuple[str, ...], names: tuple[str, ...] | set[str] = ()) -> bool:
	p = path.replace("\\", "/")
	if p in names:
		return True
	return any(p == pref.rstrip("/") or p.startswith(pref.rstrip("/") + "/") for pref in prefixes)


def is_container_path(p: str) -> bool:
	"""Root deploy compose/Dockerfile only — not packages/*/compose.yml."""
	name = PurePosixPath(p).name
	if "/" not in p.rstrip("/"):
		if name in {
			"Dockerfile",
			"compose.yml",
			"compose.yaml",
			"compose.local-db.yml",
			"compose.local-run.yml",
			"compose.alpine-db.yml",
			"compose_example.yml",
			"healthcheck.sh",
			".dockerignore",
		}:
			return True
		if name.startswith("compose") and name.endswith((".yml", ".yaml")):
			return True
	return matches(p, (".devcontainer/", "chart/", "docker/"))


def is_federation_path(p: str) -> bool:
	if matches(
		p,
		(
			"packages/backend/test-federation/",
			"packages/backend/src/core/activitypub/",
		),
	):
		return True
	# queue deliver/inbox processors
	if p.startswith("packages/backend/src/queue/processors/") and (
		"Inbox" in PurePosixPath(p).name or "Deliver" in PurePosixPath(p).name
	):
		return True
	return False


def classify(files: list[str]) -> dict[str, bool]:
	if not files:
		return {
			"backend": False,
			"frontend": False,
			"federation": False,
			"container": False,
			"shared": False,
			"all": False,
		}

	backend_prefixes = ("packages/backend/",)
	frontend_prefixes = (
		"packages/frontend/",
		"packages/frontend-embed/",
		"packages/frontend-shared/",
		"packages/sw/",
		"packages/misskey-bubble-game/",
		"packages/misskey-reversi/",
	)
	shared_names = (
		"pnpm-lock.yaml",
		"pnpm-workspace.yaml",
		"package.json",
		".node-version",
		"tsconfig.json",
	)
	shared_prefixes = (
		"packages/shared/",
		"packages/misskey-js/",
		"packages/megalodon/",
		"packages/stub/",
		"locales/",
		"scripts/",
		".github/",
		".config/",
	)

	backend = frontend = federation = container = shared = False

	for f in files:
		p = f.replace("\\", "/").lstrip("./")
		if not p or p.endswith("/"):
			continue

		if matches(p, shared_prefixes, shared_names):
			shared = True
		if is_container_path(p):
			container = True
		if is_federation_path(p):
			federation = True
		if matches(p, backend_prefixes):
			backend = True
		if matches(p, frontend_prefixes):
			frontend = True

	# shared / CI / lockfile: expand to multi-package unit validation (not federation/container)
	if shared:
		backend = True
		frontend = True
		all_wide = True
	else:
		all_wide = False

	return {
		"backend": backend,
		"frontend": frontend,
		"federation": federation,
		"container": container,
		"shared": shared,
		"all": all_wide,
	}


def main() -> int:
	ap = argparse.ArgumentParser(description=__doc__)
	ap.add_argument("--files", nargs="*", help="explicit file paths")
	ap.add_argument("--github-output", action="store_true", help="append key=value to $GITHUB_OUTPUT")
	ap.add_argument("--json", action="store_true", help="print JSON")
	args = ap.parse_args()

	if args.files is not None and len(args.files) > 0:
		files = list(args.files)
	else:
		files = [ln.strip() for ln in sys.stdin if ln.strip()]

	scopes = classify(files)

	if args.github_output:
		out = os.environ.get("GITHUB_OUTPUT")
		if not out:
			print("GITHUB_OUTPUT not set", file=sys.stderr)
			return 2
		with open(out, "a", encoding="utf-8") as fh:
			for k, v in scopes.items():
				fh.write(f"{k}={'true' if v else 'false'}\n")

	if args.json:
		import json

		print(json.dumps(scopes, sort_keys=True))
		return 0

	for k, v in scopes.items():
		print(f"{k}={'true' if v else 'false'}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
