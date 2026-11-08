# @trajectonomics/factory

The software factory for [Trajectonomics](https://github.com/trajectonomics). An hourly Dispatcher finds Eligible work and launches Runs that turn approved Specs and Tickets into reviewed pull requests. A human approves what to build and merges what comes out.

This package is never published. See [`GLOSSARY.md`](./GLOSSARY.md) for the language and [`docs/adr/`](./docs/adr/) for the decisions. The Spec is the parent issue of the build Tickets.

Where this runs and who applies it is documented in [`trajectonomics/infra`](https://github.com/trajectonomics/infra): ADR 0005 and the homeserver2 dispatcher runbook.
