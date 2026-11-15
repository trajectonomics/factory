import { deepFreeze } from "./freeze"

/** A Workers Builds deploy: the branch it builds and the Worker it publishes. */
export type DeployTarget = {
	readonly repository: string
	readonly branch: string
	readonly worker: string
}

/** The check run name GitHub reports for a Workers Builds deploy of one Worker. */
export function buildCheckName(worker: string): string {
	return `Workers Builds: ${worker}`
}

/**
 * Every deploy a Dispatcher pass verifies, by repository. Cloudflare project settings live in its
 * dashboard, so this file is the claim the pass checks after a merge, not configuration. A
 * repository that deploys and is missing here is not checked; add it in a pull request.
 */
export const DEPLOY_TARGETS: readonly DeployTarget[] = deepFreeze([
	{ repository: "docs", branch: "main", worker: "docs" },
	{ repository: "site", branch: "main", worker: "site" },
	{ repository: "web-router", branch: "main", worker: "trajectonomics-web-router" },
])
