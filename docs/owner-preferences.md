# Owner preferences

How any thread calls the owner. Read this before you ask, stop, or report status. Taken from the owner's messages, 2026-11-09 to 2026-11-14.

## The owner is a tool call

One call, then you continue. The owner answers later, without the thread in front of them, and a second message costs another round. Do the work. Call only for a return you cannot produce.

Open with the call, or with "nothing needed from you".

### Call when

1. **Only the owner can do it.** An account, a dashboard, a credential, a browser step, closing an issue, or a label the rules reserve for their word. `ready-for-agent` waits for an explicit yes in this thread, or for them to tell you to label it. `wontfix`, and removing `ready-for-human`, wait for their word. Without those words, leave the label.
2. **Only the owner can decide it.** The decision changes how the org works or is hard to undo, and the consultants disagree with you or each other, or both are unsure. A Spec drafter's Owner question is this case ([ADR 0009](./adr/0009-drafters-ask-little-and-finish-alone.md)).

Anything else is a status survey. Do not send one. Do not ask permission for the next small step.

### The input

One message, in the grill-with-docs shape. Numbered questions, the ones that change direction only, most consequential first. Each question:

- Context in plain words. Define each term once.
- Why it matters.
- A recommended answer, worded so "yes" accepts it.

"Yes" and "yes to all" are the return you write for. Give the steps they must do, plus a short summary. Detail only when they ask.

### The return

Quote a broad answer in one line, so they can correct the reading. Then finish. A question they repeat gets the answer on line 1, from the real constraint.

## Decide without a call

- Look the fact up (`gh issue view`, `gh pr view`, the schema, the code, the ADR) before you say something is blocked or impossible.
- When unsure, consult another model (`gemini-4-hydrogen`, `claude-sonnet-5-5`, `gemini-4-argon`, `grok-4.7`, `deepseek-v4.1-flash`) and take the answer you share. When the owner tells you to consult a model, consult it.
- No model runs in fast mode. Pass `fastMode: false` for every model. Never Fast.
- A decision that is safe and reversible, or local to one repository, you take. Record it, including which recommendation you took.
- A rule the owner already stated, you apply. "We do not have any client" means a breaking change is fine.
- Stay on this thread's job. Owner-only work in another repository is not yours to raise.
- A name the Factory chooses for Trajectonomics is the company name. When a step would use a personal login or name, say so in the call and ask for the company one.

## Finish without a call

- Run the loop to the end. No "Not done yet", and no stop for a small permission.
- Merge with `gh pr merge` when the pull request is green and the owner has told you to proceed. Keep an open pull request rebased and mergeable.
- End with one line: "done, safe to settle", or what remains and whose it is.
- Settle the thread (`t3_thread_organize`, action `settle`) when nothing is left for the owner and `0 waiting on owner` holds on GitHub. Check that state before you ask whether to continue.
- Write the lesson in this repository (this file, the runbook, `AGENTS.md`). Name what an override left behind, such as a check that was already failing on `main`.
