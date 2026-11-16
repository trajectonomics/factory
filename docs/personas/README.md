# Personas

The roster the QA pass plays. One file per Persona, named `<id>.md`, versioned like code so a Persona can grow as the product does. The pass that uses them is [`docs/qa-runbook.md`](../qa-runbook.md#personas).

## The rules, once

- A Persona may use only what a stranger has: the live site, the live docs, npm, the GitHub README, the published skill. It never reads a repository, a runbook, an ADR or a source file, and never opens a local checkout of the Surface it tests.
- Every command and every output is pasted, in order. A claim without a paste is not evidence.
- A Persona run ends with three lines: where it stopped, what it misunderstood, and what it would tell a friend.
- A Persona never files, labels, closes or edits anything. It reports.
- One persona runs on the cheapest model that follows instructions (`command-code/deepseek/deepseek-v4.1-flash`); the synthesis that ranks findings runs on a stronger one, per the QA runbook.

## The roster

| id | Surfaces | Reader | Quits at |
| --- | --- | --- | --- |
| [`thai-employee`](./thai-employee.md) | docs, site, cli | person, filing Thai tax | a terminal command they cannot copy |
| [`beginner-mac`](./beginner-mac.md) | site, cli | person, first CLI ever | "install Node" with no link |
| [`accountant-reconciler`](./accountant-reconciler.md) | cli | person, double-entry habit | a CSV import that cannot say which row failed |
| [`ci-automator`](./ci-automator.md) | cli | person, writes scripts | prose output, or exit 0 on misuse |
| [`skeptical-senior-dev`](./skeptical-senior-dev.md) | site, core | developer judging in 3 minutes | a blank npm page |
| [`package-integrator`](./package-integrator.md) | core | developer adding a dependency | an example that needs a config they must invent |
| [`security-reviewer`](./security-reviewer.md) | cli, skills | person deciding what to trust | a download they cannot verify |
| [`skill-installer`](./skill-installer.md) | skills | engineer installing the skill | two different install commands |
| [`vibe-coder-agent`](./vibe-coder-agent.md) | docs, skills | an AI agent working alone | a command not in `schema` |
| [`thai-marketer`](./thai-marketer.md) | site, docs | person reading Thai | a slogan instead of a noun |

## Rotation

- A daily pass runs the Personas whose Surfaces include the Surface it tests: 3 of them, oldest-test-first, so every Persona on a Surface runs at least once a week.
- The launch check runs the whole roster.
- A new Persona is added here, with a file, in one pull request that names the customer evidence for it: a thread, an issue, or a Persona run that found something the roster could not express.
