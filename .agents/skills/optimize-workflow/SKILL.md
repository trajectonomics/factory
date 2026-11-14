---
name: optimize-workflow
description: "Make a skill or workflow run more deterministic: audit every skill, get the exact next step for one, and route improvements to the place that owns them. Use when asked to optimize, streamline, or script a workflow."
---

# Optimize Workflow

Start from the script, not from exploration. The skills under `.agents/skills` are pinned from upstream in `skills-lock.json` and are never edited by hand: a step or rule changes in this repo's script or runbook, or upstream in `mattpocock/skills` / `trajectonomics/internal-skills`.

1. Run `bun run skill:audit` from the repo root. One line per skill: bundled scripts, resolved/unresolved references, model-invocation flag, lock source. Exit code 1 means a skill dir has no `SKILL.md`.
2. Before running any skill, run `bun run skill:plan <skill>` (`--json` for machines). It prints the lock source, the bundled script's exact command on the `run:` line, the files to read (skill-local and repo), and the ordered next steps. Follow that plan instead of exploring with tool calls.
3. To make a workflow more deterministic: if the skill ships no script, add the deterministic part in this repo — extend `scripts/skill-plan-cli.ts` or the runbook the skill points at, so the plan names the exact command and files. Content changes to a pinned skill go upstream as a pull request, never in place.
4. Verify with `bun run check` and `bun run skill:audit`, then open a Factory pull request.
