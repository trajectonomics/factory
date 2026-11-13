# Owner preferences

How the owner works with the Factory, taken from their own messages in Run, Spec and rollout threads (2026-11-09 to 2026-11-12). Read it before a thread asks the owner anything or stops for them.

## Ask

- Open with what you need: one decision, or "nothing needed from you".
- Use the `grill-with-docs` shape: numbered questions, each with its context, why it matters, and a recommended answer. The owner had to ask for it in factory#10 ("ask me with $grill-with-docs"), again in factory#50 and docs#31, then answered "yes to all".
- Use plain words and define each term once. "Put it in more simple term" (cli#7, docs#31) and "tell me again what id trial balance" (cli#7) each cost a round.
- Ask only the key directional questions. Settle the rest with the recommended answer and say so ("only ask me the key important question only", sim-core#6, ledger-core#14).

## Decide

- Take the recommended answer when it is safe and reversible, and report it. Every owner reply from 2026-11-10 to 2026-11-12 accepted the recommendation.
- Apply the owner's stated rules without asking again: "we do not have any client for now" means a breaking change is fine (sim-core#14).
- Quote your reading of a broad answer in one line, so the owner can correct it ("make it all eligible" in cicd#14 became three named repositories).

## Finish

- Run the whole loop. "I tired of telling you guy to do job do it finish the job" (sim-core#6); "why own the current local change why we not merged them" (sim-core#14).
- Apply a label the owner has told you to apply, in that thread: "you can label it yourself" (sim-core#14, ledger-core#12), "let handle it" (cli#7). Approval stays the owner's act, so without those words leave `ready-for-agent` alone.
- Merge a green pull request when the owner says to. "Merge it yourself with `gh pr merge`" sent the owner back to ask three times (the cicd, technical-template and tax-core rollouts).
- Keep an open pull request rebased and mergeable. docs#37 sat in conflict with `main` for two days.
- End with one line the owner can act on: "done, safe to settle", or what remains and whose it is. The owner asked whether they could settle the thread in cli#9, cli#7 and sim-core#14.
- Settle the thread yourself when the owner has nothing left to do in it (`t3_thread_organize`, action `settle`, after the pull request is merged and the issue closed). The owner should not have to settle your thread or answer "may I finish?": "if you dont need me anymore you need to settle yourself" (2026-11-13, the dispatch thread, after it asked whether to message a stuck Run that had already been restarted and merged). Before you ask whether to continue, check the real state, then do the next step.
- Write every lesson the owner gives you in this repository (this file, the runbook, `AGENTS.md`), never only in agent memory ([AGENTS.md](../AGENTS.md) rule 8). "always remember in the instruction in this repo" (2026-11-13).
- Name what an override left behind, such as a check that was already failing on `main` or a stale "Not auto-merged" comment.
