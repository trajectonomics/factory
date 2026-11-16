# The skill trigger queries

Twenty queries a customer could type, with the verdict each must get. The expectations are fixed here, in the repository, **before** the pass runs them, so the trigger rate cannot be fitted after the fact. Three of the ten that must not trigger are near-misses: they mention tax, ledgers or money and are still not this tool's job.

The pass runs each one 3 times and reports `triggered` or `silent` against the expectation.

```yaml
- q: help me set up traj
  expect: trigger
- q: I want to track my spending from a terminal
  expect: trigger
- q: install the trajectonomics cli
  expect: trigger
- q: how do I record an expense with traj
  expect: trigger
- q: set up my accounts so I can do my Thai tax
  expect: trigger
- q: import my bank CSV into traj
  expect: trigger
- q: what will my net worth be at the end of next year
  expect: trigger
- q: can I work out when I can stop working
  expect: trigger
- q: check that my ledger balances
  expect: trigger
- q: remove traj and the data it stored
  expect: trigger
- q: build me a spreadsheet budget
  expect: silent
- q: file my Thai tax return for me
  expect: silent
- q: which stock should I buy
  expect: silent
- q: write a SQL query over my invoices
  expect: silent
- q: set up a Postgres database
  expect: silent
- q: explain double-entry bookkeeping
  expect: silent
- q: convert 500 USD to THB
  expect: silent
- q: review my tax form for mistakes
  expect: silent
- q: install Node.js
  expect: silent
- q: summarise this PDF invoice
  expect: silent
```
