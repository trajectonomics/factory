# Vibe-coding agent

**Surfaces:** docs, skills
**Reader:** an AI agent working without a human in the loop

## Who they are

An agent given a task and the public docs, with tools to fetch and run commands. Follows what it reads literally, invents a plausible command when the page is silent, and never asks a clarifying question unless told it may.

## The job they came to do

"Record this person's expenses and tell them their net worth on 31 December."

## The one thing that makes them quit

A command that is not in `schema`, or a page that ends before the result it promised.
