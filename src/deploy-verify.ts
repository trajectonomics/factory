import type { DeployTarget } from "./deploy-targets"
import { buildCheckName } from "./deploy-targets"
import { deepFreeze } from "./freeze"

/** One check run as GitHub lists it for a commit; an unknown conclusion is kept as text. */
export type DeployCheckRun = {
	readonly name: string
	readonly status: string
	readonly conclusion?: string
}

/** The check runs on one commit, with the repository and branch the commit landed on. */
export type DeployObservation = {
	readonly repository: string
	readonly branch: string
	readonly commit: string
	readonly checkRuns: readonly DeployCheckRun[]
}

/** How one declared Worker stands on the observed commit. */
export type DeployCheckState =
	| { readonly kind: "built" }
	| { readonly kind: "failed"; readonly conclusion: string }
	| { readonly kind: "pending"; readonly status: string }
	| { readonly kind: "missing" }

/** One declared Worker expected on the commit. */
export type DeployCheck = {
	readonly worker: string
	readonly checkName: string
	readonly state: DeployCheckState
}

/** The build evidence on one commit and the decision it supports. */
export type DeployVerification = {
	readonly repository: string
	readonly branch: string
	readonly commit: string
	readonly expected: readonly DeployCheck[]
	readonly verdict: "not-deploying" | "confirmed" | "unconfirmed" | "drift"
}

/** The longest a pass waits for the Workers Builds runs it checks, across every commit. */
export const DEPLOY_CHECK_WAIT_MS = 90_000

/** Decides whether one merge commit carries the Workers Builds evidence its branch declares. */
export function verifyDeploy(
	observation: DeployObservation,
	targets: readonly DeployTarget[],
): DeployVerification {
	const expected = targets
		.filter(
			(target) =>
				target.repository === observation.repository && target.branch === observation.branch,
		)
		.map((target) => checkOf(target, observation.checkRuns))
	return deepFreeze({
		repository: observation.repository,
		branch: observation.branch,
		commit: observation.commit,
		expected,
		verdict: verdictOf(expected),
	})
}

function checkOf(target: DeployTarget, runs: readonly DeployCheckRun[]): DeployCheck {
	const checkName = buildCheckName(target.worker)
	const run = runs.filter((candidate) => candidate.name === checkName).at(-1)
	return { worker: target.worker, checkName, state: stateOf(run) }
}

function stateOf(run: DeployCheckRun | undefined): DeployCheckState {
	if (run === undefined) return { kind: "missing" }
	if (run.status !== "completed") return { kind: "pending", status: run.status }
	if (run.conclusion === "success") return { kind: "built" }
	return { kind: "failed", conclusion: run.conclusion ?? "unknown" }
}

function verdictOf(expected: readonly DeployCheck[]): DeployVerification["verdict"] {
	if (expected.length === 0) return "not-deploying"
	if (expected.some((check) => check.state.kind === "failed" || check.state.kind === "missing")) {
		return "drift"
	}
	if (expected.some((check) => check.state.kind === "pending")) return "unconfirmed"
	return "confirmed"
}
