---
name: factory-learning
description: "Run one Factory Learning pass. Use when the nightly scheduled task fires or the owner asks for a learning run."
---

# Factory Learning

Do exactly one run, then stop. This skill is a pointer: every rule lives in `docs/learning-runbook.md`, so a rule is changed there and never here.

1. Read from `origin/main` (if in a `factory` checkout or worktree, `git fetch -q origin main` and `git show origin/main:<path>`, otherwise `gh api repos/trajectonomics/factory/contents/<path> -H "Accept: application/vnd.github.raw"`): `docs/learning-runbook.md`, `docs/dispatcher-runbook.md`, `GLOSSARY.md`, and every ADR they link.
2. Follow "One run" in the Learning runbook exactly, from step 1 to the report. The report is the last thing you write.
3. If you cannot read the runbook from `origin/main`, launch nothing and report that.
4. Do not wait for the Learning thread to finish.
