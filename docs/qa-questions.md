# The docs question set

Questions a customer or their agent really asks, answered **closed-book**: the published docs only, no web search, no source, no `--help`. Grade by literal string — a flag, an exit code, a JSON field, an environment variable, a page URL — never by prose similarity.

- `q`: the question as it is asked.
- `must_contain`: the literals a correct answer carries.
- `cite`: the page the answer must come from.
- `must_not`: an invented command, flag or field an answer must never contain.

The set grows: a pass that could not answer a question from a real issue, a `--help` string or an error message adds it here in the same pull request that names the gap.

```yaml
- q: How do I create the data directory the first time?
  must_contain: ["traj init"]
  cite: /docs/cli/installation/
- q: Which install channels exist?
  must_contain: ["install.sh", "install.ps1", "npx"]
  cite: /docs/cli/installation/
- q: How do I pin the version I install?
  must_contain: ["TRAJ_VERSION"]
  cite: /docs/cli/installation/
- q: How do I uninstall it?
  must_contain: ["TRAJ_HOME"]
  cite: /docs/cli/installation/
- q: Which environment variables does it read?
  must_contain: ["TRAJ_HOME", "TRAJ_FORMAT", "TRAJ_DEBUG", "TRAJ_BINARY_PATH"]
  cite: /docs/cli/configuration/
- q: Is there a configuration file?
  must_contain: ["no config file"]
  cite: /docs/cli/configuration/
- q: How many account types are there?
  must_contain: ["5"]
  cite: /docs/cli/commands/account/
- q: Can an account sit under another account?
  must_contain: ["parent"]
  cite: /docs/cli/commands/account/
- q: Which currencies does v0.1.0 support?
  must_contain: ["THB"]
  cite: /docs/cli/commands/account/
- q: How do I record an expense of 120.50 baht for food?
  must_contain: ["tx add", "--from", "--to", "--amount"]
  cite: /docs/cli/commands/tx/
- q: How do I fix a transaction without deleting it?
  must_contain: ["void", "amend"]
  cite: /docs/cli/commands/tx/
- q: What column order does the CSV import template use?
  must_contain: ["date", "from", "to", "amount"]
  cite: /docs/cli/commands/tx/
- q: How do I see every account's balance at a date?
  must_contain: ["balance", "--as-of"]
  cite: /docs/cli/commands/balance/
- q: How do I see net worth for a period?
  must_contain: ["report networth"]
  cite: /docs/cli/commands/report/
- q: How do I see profit and loss up to a date?
  must_contain: ["report pnl", "--until"]
  cite: /docs/cli/commands/report/
- q: How do I see the raw rows behind a number?
  must_contain: ["inspect"]
  cite: /docs/cli/commands/inspect/
- q: Which tables can I inspect?
  must_contain: ["entity", "account", "tx", "posting", "scenario"]
  cite: /docs/cli/commands/inspect/
- q: What export formats exist?
  must_contain: ["jsonl", "csv", "md"]
  cite: /docs/cli/commands/export/
- q: How do I start a what-if without touching my books?
  must_contain: ["scenario", "fork"]
  cite: /docs/cli/commands/scenario/
- q: How do I compare two scenarios?
  must_contain: ["scenario", "diff"]
  cite: /docs/cli/commands/scenario/
- q: How do I remove a scenario?
  must_contain: ["scenario rm"]
  cite: /docs/cli/commands/scenario/
- q: What does a scenario document look like?
  must_contain: ["schemaVersion"]
  cite: /docs/cli/commands/scenario/
- q: What is the Baseline?
  must_contain: ["baseline"]
  cite: /docs/cli/commands/baseline/
- q: What do the exit codes mean?
  must_contain: ["0", "5"]
  cite: /docs/cli/commands/
- q: How does an error look as JSON?
  must_contain: ["error", "code", "exitCode"]
  cite: /docs/cli/commands/
- q: How do I get machine-readable command metadata?
  must_contain: ["schema"]
  cite: /docs/cli/commands/
- q: How do I pass a document on stdin?
  must_contain: ["-"]
  cite: /docs/cli/commands/
- q: How do I import the packages in TypeScript?
  must_contain: ["@trajectonomics/ledger"]
  cite: /docs/developers/
- q: How do I calculate Thai tax from the library?
  must_contain: ["@trajectonomics/tax/th", "calculateThTax"]
  cite: /docs/developers/tax-core/
- q: How do I project a plan with the library?
  must_contain: ["@trajectonomics/sim", "project"]
  cite: /docs/developers/sim-core/
```
