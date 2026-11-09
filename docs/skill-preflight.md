# Skill preflight

Implementation notes for [factory#13](https://github.com/trajectonomics/factory/issues/13).

A Run needs `implement`, `tdd` and `code-review` under `.agents/skills` in its repository. The Dispatcher checks
that before it launches, the same rule step 8 of the [Dispatcher runbook](./dispatcher-runbook.md) states for the
by-hand pass.

```text
dispatchCommand
  skills given by the caller? -- no -> readRepositorySkills: gh api repos/<r>/contents/.agents/skills
                                       (a missing folder is an empty list; any other failure aborts the pass)
planDispatch(reading with skills)
  repository lacks a required skill -> deferral "skills-missing", no Claim, no launch
                                       writes: a comment keyed preflight:skills naming the missing skills,
                                               and the needs-info label (so the next pass skips the issue)
  repository has all three          -> launches as before
reading without skills              -> no preflight (library callers that do not supply them)
```

The check is by presence of the skill folders, as the runbook says. It does not compare the repository's
`skills-lock.json` with the curated profile in `trajectonomics/internal-skills`.
