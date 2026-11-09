---
name: factory-dispatcher
description: "Run one Factory Dispatcher pass over the trajectonomics org. Use when the scheduled task fires or the owner asks to dispatch."
---

# Factory Dispatcher

Do exactly one pass, then stop. This skill is a pointer: every rule lives in `docs/dispatcher-runbook.md`, so a rule is changed there and never here.

1. Run `git -C /home/prame_assistant/project/factory fetch -q origin main`.
2. Read from `origin/main`, not the working tree (`git show origin/main:<path>`): `docs/dispatcher-runbook.md`, `GLOSSARY.md`, and every ADR the runbook links.
3. Follow the runbook exactly, from "One pass" step 1 to the report. The report is the last thing you write.
4. If you cannot read the runbook from `origin/main`, launch and merge nothing and report that.
5. Do not wait for Runs or reviewers to finish.
