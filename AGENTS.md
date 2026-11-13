# AGENTS.md

Instructions for AI coding agents in `trajectonomics/factory` (`@trajectonomics/factory`).

## Rules

1. Never commit to `main`. Branch (`feat/*`, `fix/*`, `docs/*`) and open a PR.
2. Never commit secrets, `.env` files, or tokens. Credentials for GitHub, hosts and model providers never enter this repository.
3. Package design: Keep core packages pure and deterministic wherever applicable (data in, data out, no I/O, no clock, no unseeded randomness). Keep boundaries closed-world with explicit contracts.
4. Bun only: `bun install`, `bun test`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles.
5. Done means `bun run check` passes (Biome lint with zero warnings, strict typecheck, tests, build, publint + are-the-types-wrong). `bun run format` fixes formatting and import order. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
6. Never edit `version` in `package.json`. This package is never published. PR titles are conventional commits (`feat:`, `fix:`, `feat!:` ...) because CI validates them.
7. Model & Pi (`pi.dev`) rules:
   - Never use `gemini-3.8-flash` anywhere; use `gemini-4-hydrogen` instead for Antigravity tasks and reviews (and `gemini-4-argon` where configured).
   - When running the Pi coding agent (`pi.dev`), strictly use **DeepSeek 4.1 Flash** only (e.g., `deepseek/deepseek-v4.1-flash`, `deepseek/deepseek-v4.1-flash-fast`), whether routed via Command Code GOAT (`command-code`) or OpenCode Go (`opencode`). Do not switch to or run any other models (Claude, GPT, Gemini, etc.) in Pi sessions for this repository. This rule is mechanically enforced via `.pi/settings.json`.
8. Factory rules live in this repo (`docs/dispatcher-runbook.md`, `GLOSSARY.md`, `docs/adr/`), never in agent memory or in a scheduled task's prompt. To change a rule, change the repo.
9. Temporary files and clones: `/tmp` is a shared, nearly full tmpfs. Never use fixed `/tmp` filenames (`--body-file /tmp/pr-body.md` collides across concurrent Runs) or install `node_modules` under `/tmp`; use `mktemp` (cleaning up) or stdin (`--body-file -`) for `gh` bodies, and clone scratch repos into `~/.cache/<slug>`.

## Scope

The Factory reads GitHub issues and the org Project's roadmap fields (milestones, Initiatives, dates; ADR 0016), and writes branches, pull requests, issues, comments, labels and board Status. It never reads Status. It never changes a host or a cloud platform. Those stay with the owner; see `trajectonomics/infra` ADR 0005. A Run merges its own pull request as the last step of its loop; there is no merge gate (ADR 0015), the owner's gate is the Spec question. Who may approve is defined in the Approval entry of `GLOSSARY.md` (ADR 0007).

## Owner

Read [`docs/owner-preferences.md`](docs/owner-preferences.md) before asking the owner a question, stopping for a decision, or reporting status. In short: finish end-to-end (including `gh pr merge` when green/told and settling your own thread when done), consult subagents on other models when unsure instead of asking the owner, verify live GitHub state and schemas first, keep messages short, and record every durable lesson in this repository rather than in agent memory.

## Agent skills

### Skills included in this repo

- **Matt Pocock Skills (`mattpocock/skills`)**: Complete engineering workflow including `/ask-matt`, `/tdd`, `/implement`, `/code-review`, `/wayfinder`, `/diagnosing-bugs`, `/codebase-design`, `/grill-with-docs`, etc.
- **Trajectonomics Internal Skills (`trajectonomics/internal-skills`)**: Organization-specific workflow including `/pick-the-issue` to discover unblocked GitHub issues not currently handled by active T3 Code sessions and route them into the `ask-matt` framework.

### Reviewing a diff

`CODING_STANDARDS.md`: the conventions `bun run check` cannot enforce. Read it when reviewing, not when implementing.

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Installing and updating skills

Skills come from [`mattpocock/skills`](https://github.com/mattpocock/skills) and [`trajectonomics/internal-skills`](https://github.com/trajectonomics/internal-skills) via the Vercel [`skills`](https://github.com/vercel-labs/skills) CLI and are pinned in `skills-lock.json`. The canonical copy is `.agents/skills/` (read natively by Codex, OpenCode, Pi, and Antigravity CLI); `.claude/skills/` holds symlinks into it for Claude Code. Never edit them by hand.

- Update: `bun run skills:update` (or `npx skills update -p -y`)
- Check status: `bun run skills:check` (or `npx skills check`)
- Reinstall:
  ```bash
  npx skills add mattpocock/skills --skill '*' -a claude-code codex opencode antigravity-cli pi -y
  npx skills add trajectonomics/internal-skills -y
  ```
- Restore from the lock: `npx skills experimental_install`
