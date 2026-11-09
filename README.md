# @trajectonomics/factory

The software factory for [Trajectonomics](https://github.com/trajectonomics). An hourly Dispatcher finds Eligible work and launches Runs that turn approved Specs and Tickets into reviewed pull requests. The owner approves what to build, or a Spec drafter does once nothing is left for the owner to decide ([ADR 0007](./docs/adr/0007-spec-drafter-can-approve.md)). Pull requests that pass every check and two independent reviews are merged by the Run that built them ([ADR 0005](./docs/adr/0005-run-merges-its-own-pull-request.md)); the rest wait for the human.

This package is never published. See [`GLOSSARY.md`](./GLOSSARY.md) for the language and [`docs/adr/`](./docs/adr/) for the decisions. The Spec is the parent issue of the build Tickets.

Where this runs and who applies it is documented in [`trajectonomics/infra`](https://github.com/trajectonomics/infra): ADR 0005 and the homeserver2 dispatcher runbook.
