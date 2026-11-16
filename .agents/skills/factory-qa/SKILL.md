---
name: factory-qa
description: "Run one Factory QA pass over one Surface, testing the product as it is published. Use when a QA scheduled task fires or the owner asks for a QA run."
---

# Factory QA

Do exactly one pass over one Surface, then stop. This skill is a pointer: every rule lives in `docs/qa-runbook.md`, so a rule is changed there and never here.

1. The Surface is named in your launch message. If it is missing or not one of `docs`, `site`, `cli`, `skills`, `core`, run nothing and report that.
2. Read from the repository root (`git fetch -q origin main`, then `git show origin/main:<path>`): `docs/qa-runbook.md`, `GLOSSARY.md`, `docs/personas/README.md`, every Persona file for the panel, and `docs/qa-questions.md` or `docs/qa-tasks.md` when the Surface names one. If you cannot read the runbook, launch nothing and report that.
3. Follow "The QA thread" and then that Surface's playbook in the runbook, from the first step to the report. The report is the last thing you write.
4. Test the published thing only: `latest` on npm, the live URL, the published skill. Never test `main`, and never read a Surface repository as a substitute for using the product.
5. File findings as `docs/qa-runbook.md`, section "Filing" says. Never edit a Surface repository, never push a branch, never change a host or a cloud platform, and never add `ready-for-agent`, `ready-for-human` or `wontfix`.
6. Finish with the one line the runbook asks for.
