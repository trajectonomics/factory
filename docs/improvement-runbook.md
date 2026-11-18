# Improvement runbook

How the owner's words in a T3 Code session become a change in how the Factory works. The owner says what a thread, a Run or a draft should have done differently, and one pass quotes those words, finds the rule that produced the behaviour, changes the rule where it lives, and lands it before the session ends. This is the daytime counterpart of the nightly [Learning job](./learning-runbook.md): Learning infers friction from the day's threads; an improvement starts from what the owner just said.

The `factory-improvement` skill (`.agents/skills/factory-improvement/SKILL.md`) only points here: a rule is changed in this file, `docs/owner-preferences.md`, one of the runbooks, `GLOSSARY.md` or `docs/adr/`, never in the skill ([ADR 0025](./adr/0025-an-improvement-pass-lands-the-owners-words.md)).

## One improvement

1. **Collect the owner's words.** Quote each sentence in this session that says how the Factory should work, what it did wrong, or what it should do instead, one line each, with the thread. The owner's words are the evidence and the boundary: a change no sentence asks for does not belong in this pass.
2. **Name the rule that produced the behaviour.** For each sentence, name the file and the rule that made the thread behave that way: `docs/owner-preferences.md` for how the owner is called; `docs/dispatcher-runbook.md` for the Dispatcher, a Run, a Spec drafter or an owner assistant; the job's own runbook for Learning, Next steps or Improvement; `GLOSSARY.md` for a word; `docs/adr/` for a decision. When an existing rule already says it, that is the finding: the thread did not follow it, so strengthen that rule or add the check that holds it, never a second rule beside it.
3. **Choose the home.** One cause, one file. A preference about calling the owner goes in `docs/owner-preferences.md`. A thread's behaviour goes in the runbook section its reader reads. A term goes in `GLOSSARY.md`. A hard-to-reverse decision the owner just made goes in an ADR that quotes them and names the rule it amends. A mechanical mistake becomes a check under `src/` or `scripts/` that `bun run check` runs. Do not put a rule in this runbook because it was convenient.
4. **Ask in the chat only what the words leave open.** One question, with a recommendation, in the chat, never by pointing at an issue ([ADR 0024](./adr/0024-the-owner-answers-questions-in-the-chat.md)). Take the recommendation for everything reversible and say so.
5. **Write the change and check it.** Branch `feat/<slug>` or `docs/<slug>` from `origin/main`, one cause per commit. Run `bun run check`. Never loosen `tsconfig*.json` or `biome.json`, never edit `version` in `package.json`, never commit a secret.
6. **Review and merge.** Open a ready pull request with a conventional title, the owner's sentence under **Evidence**, and each file under **Changes**. Run the two independent reviews a Learning runs, clean, with no quota fallback ([Learning brief](./learning-runbook.md#launch-message-and-brief)); fix every finding that is correct. Merge under [Merging](./dispatcher-runbook.md#merging) — `Mode` live, no `.factory-no-automerge` — when every check passes and the reviews are clean. A change the owner did not say may only touch what the Learning merge gate lets an agent change. A change to the Allowlist, Hosts, Merging text, a Guard number or the Learning merge gate stays open for the owner even when they asked.
7. **Report one line.** `IMPROVEMENT <pull request url>, rules <files>, merged <yes, or no: reason>`.

## Hard rules

Never edit `goals`. Never touch a host or a cloud platform. Never copy a thread transcript into a file, a pull request or an issue: cite the thread and quote the owner's sentence alone. Bun only.
