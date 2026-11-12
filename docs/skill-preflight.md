# Skill preflight

Implementation notes for [factory#13](https://github.com/trajectonomics/factory/issues/13) and the lock
comparison of [factory#50](https://github.com/trajectonomics/factory/issues/50).

A Run needs `implement`, `tdd` and `code-review` under `.agents/skills` in its repository, and a
`skills-lock.json` whose entries for those three skills match the curated profile in
`trajectonomics/internal-skills`. The Dispatcher checks both before it launches, the same rules step 8 of the
[Dispatcher runbook](./dispatcher-runbook.md) states for the by-hand pass.

```text
dispatchCommand
  skills given by the caller?     -- no -> readRepositorySkills: gh api repos/<r>/contents/.agents/skills
                                          (a missing folder is an empty list; any other failure aborts the pass)
  skillLocks given by the caller? -- no -> readRepositorySkillLocks: gh api repos/<r>/contents/skills-lock.json
                                          (404 is "no lock"; content that is not a lock is "unreadable";
                                           any other failure aborts the pass)
planDispatch(reading with skills and skillLocks)
  repository lacks a required skill -> deferral "skills-missing", no Claim, no launch
                                       writes: a comment keyed preflight:skills naming the missing skills,
                                               and the needs-info label
  repository has all three but its lock differs
                                    -> deferral "skills-lock-mismatch", no Claim, no launch
                                       writes: a comment keyed preflight:skills-lock naming each skill and
                                               what differs, plus the fix command, and needs-info
  repository matches the profile    -> launches as before
reading without skills              -> no preflight (library callers that do not supply it)
reading with skills, no skillLocks  -> the folder rule only (library callers that do not supply locks)
```

The folder check decides first: a repository without the skill folders gets the install message and not two
comments. A lock matches when each required skill has an entry whose `source` is `mattpocock/skills` and whose
`computedHash` is the profile's. `ref`, `skillPath` and `sourceType` are not compared, because a lock written by
`skills add` carries no `ref`. A skill file edited in place while the lock is untouched is out of scope.

## The reference table

`src/skill-profile.ts` records the pin from `internal-skills/profiles/factory.json` and the `computedHash` each
required skill gets at that ref with `skills@1.7.6`. It is a copy, not a live read: the Dispatcher does not call
`internal-skills` on every pass.

To bump it when the profile's pin changes:

1. In a scratch checkout, run `npx -y --package=github:trajectonomics/internal-skills#main install-skills-profile`.
   It runs `skills@1.7.6 experimental_sync` at the profile's pinned commit.
2. Read the `computedHash` of `implement`, `tdd` and `code-review` from the `skills-lock.json` it wrote, and copy
   them into `SKILL_PROFILE`. Update `version` and `ref` from the profile's `mattpocock/skills` source entry, and
   `cli` if the installer's `skills` version changed.
3. Run `bun run check`, and merge the one-file change in a Factory pull request.

A bump flags every repository still on the old hashes until it updates. If every repository is flagged at once
(for example after a CLI hash change), revert the bump.

The fix command in the preflight comment is the profile installer:

```bash
npx -y --package=github:trajectonomics/internal-skills#main install-skills-profile
```
