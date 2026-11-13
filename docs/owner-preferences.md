# Owner preferences

How the owner works with the Factory, taken from their own messages in Run, Spec, assist and rollout threads (2026-11-09 to 2026-11-13). Read it before a thread asks the owner anything or stops for them.

## Ask

- Open with what you need: one decision, or "nothing needed from you".
- Apply the hard-to-undo test everywhere (Spec drafters, Owner assistants, Dispatcher nudge): ask only what only a human can decide or what is hard to reverse. Never send a multi-item status survey ("do not waste my time... only ask me if it really nesseary", 2026-11-13).
- Use the `grill-with-docs` shape: numbered questions, each with its context, why it matters, and a recommended answer. The owner had to ask for it in factory#10 ("ask me with $grill-with-docs"), again in factory#50 and docs#31, then answered "yes to all".
- Use plain words and define each term once. "Put it in more simple term" (cli#7, docs#31) and "tell me again what id trial balance" (cli#7) each cost a round.
- Ask only the key directional questions. Settle the rest with the recommended answer and say so ("only ask me the key important question only", sim-core#6, ledger-core#14).
- Keep messages short: tell the owner only what they must do, plus a short summary. Highlight only what you need from the owner and give detail only when asked ("only tell me what I need to do", docs Workers Builds setup; "ask me simple only highlight what you need from me", Project OKR Goal Setup, 2026-11-13).
- Answer repeated owner questions directly on line 1 using the actual constraint, never dropping the answer when shortening (docs Workers Builds setup, 2026-11-13: "2 thing that you mess up and I dont get answer").
- Do not nag the owner about out-of-scope owner-only tasks in other repositories ("why do you care about the ccli release it not your job", Project OKR Goal Setup, 2026-11-13).

## Decide

- Take the recommended answer when it is safe and reversible, and report it. Every owner reply from 2026-11-10 to 2026-11-12 accepted the recommendation.
- When unsure, consult subagents on other models (`gemini-4-hydrogen`, `claude-sonnet-5-5`, `gemini-4-argon`, `deepseek-v4.1-flash`) instead of asking the owner ("if you not sure let spawn hydrogen4 high from antigravity and ask it this", assist/decisions-and-reviews; "if you not usre let run the subagetns and ask them first", assist/npm-publishing, 2026-11-13). Never decline the owner's instruction to consult a model because you felt sure.
- Apply the owner's stated rules without asking again: "we do not have any client for now" means a breaking change is fine (sim-core#14).
- Quote your reading of a broad answer in one line, so the owner can correct it ("make it all eligible" in cicd#14 became three named repositories).
- Verify CLI and API capabilities (such as GraphQL schema introspection) and live GitHub state (`gh issue view`, `gh pr view`) before telling the owner something is impossible or blocked (Project OKR Goal Setup, How to Schedule Dispatch Work, 2026-11-13).
- Keep the company and the owner apart. Anything the Factory sets up or names for Trajectonomics must carry the company name, never the owner's personal login or name: the `workers.dev` subdomain showed `fromsukong`, and the owner said "this is not ok" (docs Workers Builds setup, 2026-11-13). When a setup step would use a personal name or account, say so up front and ask for the company one.

## Finish

- Run the whole loop end-to-end without stopping partway with a `## Not done yet` section or asking small permission questions ("why it still ask me small question and do not complete the work on their own e2e?", 2026-11-13; "I tired of telling you guy to do job do it finish the job", sim-core#6; "why own the current local change why we not merged them", sim-core#14).
- Apply a label the owner has told you to apply, in that thread: "you can label it yourself" (sim-core#14, ledger-core#12), "let handle it" (cli#7), or "yes" to a question asking whether to mark an issue `ready-for-agent` (assist/decisions-and-reviews Q3). Approval stays the owner's act, so without those words leave `ready-for-agent` alone.
- Merge open pull requests yourself (`gh pr merge`) when green and when the owner tells you to proceed ("merged and do all your?", Project OKR Goal Setup, 2026-11-13; "Merge it yourself with `gh pr merge`" in cicd, technical-template and tax-core rollouts). Never bounce back saying GitHub still shows your own open pull requests as open.
- Keep an open pull request rebased and mergeable. docs#37 sat in conflict with `main` for two days.
- End with one line the owner can act on: "done, safe to settle", or what remains and whose it is. The owner asked whether they could settle the thread in cli#9, cli#7 and sim-core#14.
- Settle the thread yourself when the owner has nothing left to do in it (`t3_thread_organize`, action `settle`, after the pull request is merged and the issue closed, and only when `0 waiting on owner` genuinely holds on GitHub — never settle while an issue still waits on the owner). The owner should not have to settle your thread or answer "may I finish?": "if you dont need me anymore you need to settle yourself" (2026-11-13, the dispatch thread, after it asked whether to message a stuck Run that had already been restarted and merged). Before you ask whether to continue, check the real state, then do the next step.
- Write every lesson the owner gives you in this repository (this file, the runbook, `AGENTS.md`), never only in agent memory ([AGENTS.md](../AGENTS.md) rule 8). "always remember in the instruction in this repo" (2026-11-13).
- Name what an override left behind, such as a check that was already failing on `main` or a stale "Not auto-merged" comment.
