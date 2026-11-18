---
name: factory-improvement
description: "Turn what the owner said in this session about how the Factory should work into a change in this repository, and land it. Use when the owner asks to improve the Factory, says a thread, Run or draft should have behaved differently, or gives a rule for next time."
---

# Factory Improvement

Do one improvement pass, then stop. This skill is a pointer: every rule lives in [`docs/improvement-runbook.md`](../../../docs/improvement-runbook.md), so a rule is changed there and nowhere else.

1. Run `git fetch -q origin main`.
2. Read from `origin/main` (`git show origin/main:<path>`): `docs/improvement-runbook.md`, `docs/owner-preferences.md`, `GLOSSARY.md`, and every ADR the runbook links.
3. Follow "One improvement" in the Improvement runbook from step 1 to the report. The report is the last thing you write.
4. If you cannot read the runbook from `origin/main`, change nothing and say so.
