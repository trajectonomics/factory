import type { GitHubClient } from "./client"
import { createGhCreateClient } from "./gh-create"
import { createGhReadClient } from "./gh-read"
import { type GhRunner, runGh } from "./gh-run"
import { createGhWriteClient } from "./gh-write"

export type { GhRunner } from "./gh-run"
export { runGh } from "./gh-run"

/** Builds the GitHub client over the `gh` CLI, with the command runner injectable for tests. */
export function createGhCliClient(run: GhRunner = runGh): GitHubClient {
	return { ...createGhReadClient(run), ...createGhWriteClient(run), ...createGhCreateClient(run) }
}
