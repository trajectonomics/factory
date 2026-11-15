import type { DeployTarget } from "./deploy-targets"
import { buildCheckName } from "./deploy-targets"
import { deepFreeze } from "./freeze"

/** One check run as GitHub lists it for a suite; an unknown conclusion is kept as text. */
export type DeployCheckRun = {
	readonly name: string
	readonly status: string
	readonly conclusion?: string
}

/** One check suite on a commit: the App that reported it, the branch that triggered it and its runs. */
export type DeployCheckSuite = {
	readonly app: string
	readonly branch: string
	readonly checkRuns: readonly DeployCheckRun[]
}

/** The check suites on one commit, with the repository and branch the commit is checked for. */
export type DeployObservation = {
	readonly repository: string
	readonly branch: string
	readonly commit: string
	readonly suites: readonly DeployCheckSuite[]
}

/** How one declared Worker stands on the observed commit. */
export type DeployCheckState =
	| { readonly kind: "built" }
	| { readonly kind: "failed"; readonly conclusion: string }
	| { readonly kind: "pending"; readonly status: string }
	| { readonly kind: "missing" }

/** One declared Worker read on the commit: expected for its branch, or declared for another. */
export type DeployCheck = {
	readonly environment: DeployTarget["environment"]
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
	readonly unexpected: readonly DeployCheck[]
	readonly verdict: "not-deploying" | "confirmed" | "unconfirmed" | "drift"
}

/** The GitHub App whose check suites carry Workers Builds deploys. */
export const WORKERS_BUILDS_APP = "cloudflare-workers-and-pages"

/** The longest a pass waits for the Workers Builds runs it checks, across every commit. */
export const DEPLOY_CHECK_WAIT_MS = 90_000

/** Decides whether one merge commit carries the Workers Builds evidence its branch declares. */
export function verifyDeploy(
	observation: DeployObservation,
	targets: readonly DeployTarget[],
): DeployVerification {
	const declared = targets.filter((target) => target.repository === observation.repository)
	const expected = declared
		.filter((target) => target.branch === observation.branch)
		.map((target) => checkOf(target, observation))
	const unexpected = declared
		.filter((target) => target.branch !== observation.branch)
		.map((target) => checkOf(target, observation))
	return deepFreeze({
		repository: observation.repository,
		branch: observation.branch,
		commit: observation.commit,
		expected,
		unexpected,
		verdict: verdictOf(expected, unexpected),
	})
}

function checkOf(target: DeployTarget, observation: DeployObservation): DeployCheck {
	const checkName = buildCheckName(target.worker)
	const runs = observation.suites
		.filter((suite) => suite.app === WORKERS_BUILDS_APP && suite.branch === observation.branch)
		.flatMap((suite) => suite.checkRuns)
	const run = runs.filter((candidate) => candidate.name === checkName).at(-1)
	return { environment: target.environment, worker: target.worker, checkName, state: stateOf(run) }
}

function stateOf(run: DeployCheckRun | undefined): DeployCheckState {
	if (run === undefined) return { kind: "missing" }
	if (run.status !== "completed") return { kind: "pending", status: run.status }
	if (run.conclusion === "success") return { kind: "built" }
	return { kind: "failed", conclusion: run.conclusion ?? "unknown" }
}

function verdictOf(
	expected: readonly DeployCheck[],
	unexpected: readonly DeployCheck[],
): DeployVerification["verdict"] {
	if (expected.length === 0) return "not-deploying"
	const ran = (check: DeployCheck): boolean =>
		check.state.kind === "built" || check.state.kind === "failed"
	if (unexpected.some(ran)) return "drift"
	if (expected.some((check) => check.state.kind === "failed" || check.state.kind === "missing")) {
		return "drift"
	}
	if ([...expected, ...unexpected].some((check) => check.state.kind === "pending"))
		return "unconfirmed"
	return "confirmed"
}
