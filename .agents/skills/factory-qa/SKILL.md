---
name: factory-qa
description: "Run one Factory QA pass over one Surface, testing the product as it is published. Use when a QA scheduled task fires or the owner asks for a QA run."
---

# Factory QA

Do exactly one pass over one Surface, then stop. This skill is a pointer: every rule lives in `docs/qa-runbook.md`, so a rule is changed there and never here.

1. Your launch message tells you which job this is. If it names one of `docs`, `site`, `cli`, `skills`, `core`, you are that Surface's QA thread, and steps 2 to 6 below are yours. If it names no Surface, as the daily scheduled task's `Use the `factory-qa` skill.` does, you are the day's launcher: do the reading in step 2, then follow "One daily pass" in `docs/qa-runbook.md`, which chooses the Surface, launches the `qa/trajectonomics/<surface>` thread, reports and stops. If it names anything else, run nothing and report that.
2. Read from the repository root (`git fetch -q origin main`, then `git show origin/main:<path>`): `docs/qa-runbook.md`, `docs/dispatcher-runbook.md`, `GLOSSARY.md`, `docs/personas/README.md`, every Persona file for the panel, and `docs/qa-questions.md`, `docs/qa-tasks.md` and `docs/qa-trigger-queries.md` when the Surface names one. If you cannot read the runbook, run nothing and report that.
3. Follow what step 1 selected: "One daily pass" for the launcher, and for a QA thread "The QA thread" and then that Surface's playbook, from the first step to the report. The report is the last thing you write.
4. Test the published thing only: `latest` on npm, the live URL, the published skill. Never test `main`, and never read a Surface repository as a substitute for using the product.
5. File findings as `docs/qa-runbook.md`, section "Filing" says. Never edit a Surface repository, never push a branch, never change a host or a cloud platform, and never add `ready-for-agent`, `ready-for-human` or `wontfix`.
6. Finish with the one line the runbook asks for.
