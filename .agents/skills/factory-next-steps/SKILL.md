---
name: factory-next-steps
description: "Run one Factory Next-step finder pass. Use when the daily scheduled task fires or the owner asks for a next-steps run."
---

# Factory Next Steps

Do exactly one run, then stop. This skill is a pointer: every rule lives in `docs/next-steps-runbook.md`, so a rule is changed there and never here.

1. Read from `origin/main` (if in a `factory` checkout or worktree, `git fetch -q origin main` and `git show origin/main:<path>`, otherwise `gh api repos/trajectonomics/factory/contents/<path> -H "Accept: application/vnd.github.raw"`): `docs/next-steps-runbook.md`, `docs/dispatcher-runbook.md`, `GLOSSARY.md`, and every ADR they link.
2. Follow "The finder" in the Next steps runbook exactly, from step 1 to the report. The report is the last thing you write.
3. If you cannot read the runbook from `origin/main`, launch nothing and report that.
4. Do not wait for the finder threads to finish.
