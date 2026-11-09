import type { IssueKey } from "./contracts"
import type { DispatchMode, FactoryPullRequest, HostLoad } from "./dispatch-contracts"
import type { DispatchLaunch, DispatchReport, DispatchRunRecord } from "./dispatch-plan-contracts"
import { issueOfRun, keyOf } from "./keys"

/** The six-line text summary the Dispatcher prints for a pass report. */
export function formatDispatchReport(report: DispatchReport, mode?: DispatchMode): string {
	const runs = mode === "dry-run" ? "Runs (would launch)" : "Runs"
	return [
		`${runs}: ${report.runs.length}${runSummary(report.runs)}`,
		`PRs: ${report.pullRequests.length}${pullRequestSummary(report.pullRequests)}`,
		`Gate failures: ${report.gateFailures.length}${issueSummary(
			report.gateFailures.map((failure) => failure.issue),
		)}`,
		`Exits: spec gap ${report.exits["spec-gap"]}, follow-up ${report.exits["follow-up"]}, urgent ${report.exits.urgent}, gate failure ${report.exits["gate-failure"]}`,
		`Stale Claims: ${report.staleClaims.length}${issueSummary(report.staleClaims)}`,
		`Host load: ${hostSummary(report.hostLoad)}`,
	].join("\n")
}
function runSummary(runs: readonly DispatchRunRecord[]): string {
	if (runs.length === 0) return ""
	return ` (${runs.map((run) => `${keyOf(run.issue)} ${run.kind} on ${run.host}`).join(", ")})`
}
function pullRequestSummary(pullRequests: readonly FactoryPullRequest[]): string {
	if (pullRequests.length === 0) return ""
	return ` (${pullRequests
		.map((pullRequest) => `${keyOf(pullRequest.issue)} ${pullRequest.draft ? "draft" : "ready"}`)
		.join(", ")})`
}
function issueSummary(issues: readonly IssueKey[]): string {
	if (issues.length === 0) return ""
	return ` (${issues.map(keyOf).join(", ")})`
}
function hostSummary(hosts: readonly HostLoad[]): string {
	if (hosts.length === 0) return "none"
	return hosts
		.map(
			(host) =>
				`${host.host} load ${host.loadAverage.toFixed(1)}, memory ${percent(host.memoryUsedFraction)}, disk ${percent(host.diskUsedFraction)}`,
		)
		.join("; ")
}
function percent(fraction: number): string {
	return `${Math.round(fraction * 100)}%`
}
/** The dry-run line for one planned Run launch. */
export function formatLaunch(launch: DispatchLaunch): string {
	const issue = keyOf(issueOfRun(launch.run))
	const fallback = launch.fallback ? ` (fallback from ${launch.run.host})` : ""
	return `launch ${issue} on ${launch.host}${fallback}: ${launch.request.title} (${launch.request.branch})`
}
