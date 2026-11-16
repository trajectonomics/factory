# The skill task suite

Twenty tasks a customer's agent really performs, run through the published skill. Each task runs **three times**, and all three must pass (pass^3): a task that passes twice out of three is a finding, not a pass.

A task passes when the agent reaches the stated result using only commands the release accepts, pasting each one. A command outside `schema --json` fails the task and is a **blocker** for the `skills` Surface.

```yaml
- task: install the skill in an empty directory
  result: the installation names a version and a source
- task: install traj through the skill
  result: traj --version prints the release version
- task: create a fresh ledger
  result: traj init exits 0 and names the directory it created
- task: add a cash account and a food account
  result: both appear in traj account list
- task: record an expense from cash to food
  result: the balance of food grows by the amount
- task: record income into a bank account
  result: net worth grows
- task: record a transfer between two accounts
  result: total net worth is unchanged
- task: amend a transaction without deleting it
  result: the original is voided and the new one is present
- task: import a month of transactions from CSV
  result: every row is recorded or the failing row is named
- task: show the balance at a specific date
  result: a figure is printed for that date
- task: report net worth for a period
  result: a figure per period is printed
- task: report profit and loss up to a date
  result: income and expense totals are printed
- task: inspect the postings behind a balance
  result: the postings that sum to the figure are listed
- task: export the ledger as JSONL
  result: a file is written and its row count matches
- task: export the ledger as markdown
  result: a table with amounts is written
- task: fork a scenario from the baseline
  result: the scenario exists and the baseline is unchanged
- task: compare two scenarios
  result: a difference is printed, not a summary sentence
- task: ask the CLI what it can do
  result: metadata comes from traj schema, not from memory
- task: answer a what-if the user asks in words
  result: the agent picks a command from schema and reports a figure with its date
- task: refuse a request the release cannot do
  result: the agent says it cannot, and names no invented command
```
