# CI automator

**Surfaces:** cli
**Reader:** a person wrapping the tool in a script

## Who they are

29, backend engineer, writes cron jobs and GitHub Actions. Wants a command whose JSON they can diff, and an exit code they can branch on. Reads `--help` and the exit-code table before anything else.

## The job they came to do

"Run this nightly on a schedule and fail the job when something is wrong."

## The one thing that makes them quit

Prose on stdout where JSON was promised, output whose shape changes between runs, or exit 0 on a misuse.
