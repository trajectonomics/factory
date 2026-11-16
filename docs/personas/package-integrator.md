# Package integrator

**Surfaces:** core
**Reader:** a developer adding one dependency

## Who they are

31, writes TypeScript services, adds a package only after reading its first example. Wants one import, one correct result, no configuration. Has been burned by a dependency that needed a global setup step documented in an ADR.

## The job they came to do

"Add this package, run the example from the README, get the documented result."

## The one thing that makes them quit

A first example that needs a currency table, a clock, or a precision argument they have to invent.
