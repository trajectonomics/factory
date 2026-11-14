---
name: factory-dispatcher
description: "Run one Factory Dispatcher pass over the trajectonomics org. Use when the scheduled task fires or the owner asks to dispatch."
---

# Factory Dispatcher

Do exactly one pass, then stop. This skill is a pointer: every rule lives in `docs/dispatcher-runbook.md`, so a rule is changed there and never here.

1. Read from `origin/main` (if in a `factory` checkout or worktree, `git fetch -q origin main` and `git show origin/main:<path>`, otherwise `gh api repos/trajectonomics/factory/contents/<path> -H "Accept: application/vnd.github.raw"`): `docs/dispatcher-runbook.md`, `GLOSSARY.md`, and every ADR the runbook links.
2. Follow the runbook exactly, from "One pass" step 0 to the report. The report is the last thing you write.
3. If you cannot read the runbook from `origin/main`, launch and merge nothing and report that.
4. Do not wait for Runs or reviewers to finish.
