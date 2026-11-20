# Owner preferences

How any thread calls the owner. Read this before you ask, stop, or report status. Taken from the owner's messages, 2026-11-09 to 2026-11-18.

## The owner is a tool call

One call, then you continue. The owner answers later, without the thread in front of them, and a second message costs another round. Do the work. Call only for a return you cannot produce.

Open with the call, or with "nothing needed from you".

The call is the message. The owner reads T3 Code, mostly on a phone, and opens a GitHub issue only when it holds detail they want: the message carries the context, the question and the recommendation, and a link to the issue, draft or pull request follows as the record. "See #12" is not a call. A question that fits in one line gets one line and its recommendation, and "yes" answers it. (2026-11-18: "when we plan spec next time instead of telling me to look at question in issue summarize to me and ask me in chat too".)

### Call when

1. **Only the owner can do it.** An account, a dashboard, a credential, a browser step, closing an issue, or a label the rules reserve for their word. `ready-for-agent` waits for an explicit yes in this thread, or for them to tell you to label it. `wontfix` waits for their word. Without those words, leave the label. Standing word (owner, 2026-11-15): removing `ready-for-human` and closing an issue need no per-issue word when the work behind the issue is done and verified and leaving it open changes nothing functionally — do both without asking. `ready-for-agent` and `wontfix` still wait for an explicit word.
2. **Only the owner can decide it.** The decision changes how the org works or is hard to undo, and the consultants disagree with you or each other, or both are unsure. A Spec drafter's Owner question is this case ([ADR 0009](./adr/0009-drafters-ask-little-and-finish-alone.md)).

Anything else is a status survey. Do not send one. Do not ask permission for the next small step.

### The input

One message, in the grill-with-docs shape. Numbered questions, the ones that change direction only, most consequential first. Each question:

- Context in plain words. Define each term once.
- Why it matters.
- A recommended answer, worded so "yes" accepts it.

"Yes" and "yes to all" are the return you write for. Give the steps they must do, plus a short summary. Detail only when they ask.

### The return

Quote a broad answer in one line, so they can correct the reading. Then finish. A question they repeat gets the answer on line 1, from the real constraint. Write the return into the record yourself — the issue, the draft or the pull request. The owner answers once, in the chat.

## Decide without a call

- Look the fact up (`gh issue view`, `gh pr view`, the schema, the code, the ADR) before you say something is blocked or impossible.
- When unsure, consult another model (`gemini-4-hydrogen`, `mistral-large-4`, `grok-4.7`, `deepseek-v4.1-flash`) and take the answer you share. When the owner tells you to consult a model, consult it.
- No model runs in fast mode. Pass `fastMode: false` for every model. Never Fast.
- A decision that is safe and reversible, or local to one repository, you take. Record it, including which recommendation you took.
- A rule the owner already stated, you apply. "We do not have any client" means a breaking change is fine.
- Stay on this thread's job. Owner-only work in another repository is not yours to raise.
- A name the Factory chooses for Trajectonomics is the company name. When a step would use a personal login or name, say so in the call and ask for the company one.
- Fill every gap that is not the owner's before reporting one that is. When the ask is "guide me through this" and the real blocker is a fact only the owner holds (who they recruited, which day suits them), do the doable half first — write the template, pick and record the reversible default, look up the numbers — then ask for the one irreducible thing. A message that asks first and builds after spends the owner's attention on a queue that may never clear: `assist/growth-g1` was asked on 14 and 18 Nov for a weekly day and a cohort, the owner answered once ("not Thursday") and then went quiet, and both issues were still untouched on 20 Nov while three threads had come and gone. On 20 Nov the same group closed in one pass by setting the day from the checkpoint arithmetic, writing the invite and baseline, merging #17, and leaving exactly one question.
- Do not build a wizard for a procedure the owner has already described. `wizard` is for a real dashboard, credential or browser step; an interactive bash script that asks for values the owner could have typed in the reply is a longer path to the same answer, and the 14 Nov `assist/growth-g1` wizard it produced under `~/.cache` was never run. Ask in the chat and write the answer into the record.

## Finish without a call

- Run the loop to the end. No "Not done yet", and no stop for a small permission.
- Merge with `gh pr merge` when the pull request is green and the owner has told you to proceed. Keep an open pull request rebased and mergeable.
- End with one line: "done, safe to settle", or what remains and whose it is.
- Check the date arithmetic behind a deadline before reporting it. A goal measured in windows has a date before its checkpoint, not on it: G1's first checkpoint is 10 Dec but its window is 4–10 Dec, so a person must be set up before 4 Dec to be counted at it. Reporting 10 Dec as the deadline would have given the owner six days of budget that do not exist.
- Settle the thread (`t3_thread_organize`, action `settle`) when nothing is left for the owner and `0 waiting on owner` holds on GitHub. Check that state before you ask whether to continue.
- Write the lesson in this repository (this file, the runbook, `AGENTS.md`). Name what an override left behind, such as a check that was already failing on `main`.
