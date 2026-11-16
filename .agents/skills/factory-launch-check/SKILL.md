---
name: factory-launch-check
description: "Run the Factory launch check over all five Surfaces before a release, ending in one ship-or-not verdict. Use when the owner asks for a launch check or the day before a launch."
---

# Factory launch check

One run, then stop. This skill is a pointer: every rule lives in `docs/qa-runbook.md`, so a rule is changed there and never here.

1. Read from the repository root (`git fetch -q origin main`, then `git show origin/main:<path>`): `docs/qa-runbook.md`, `GLOSSARY.md`, `docs/personas/README.md` and every Persona file, `docs/qa-questions.md`, `docs/qa-tasks.md` and `docs/qa-trigger-queries.md`. If you cannot read the runbook, run nothing and report that.
2. Follow `docs/qa-runbook.md`, section "The launch check" in the runbook, from pinning the release to `docs/qa-runbook.md`, section "The launch report". The report is the last thing you write, and the verdict is its first line.
3. Refuse a `SHIP` verdict when the thing under test is `main` and not a release; say that instead, and say what would make it a release.
4. File nothing, open no pull request, change no label, and never edit a Surface repository. The verdict is the owner's to act on, and this run does not act on it.
