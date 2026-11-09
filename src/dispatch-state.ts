import { CLAIM_LABEL } from "./claim"
import type { IssueKey, IssueState, RepositoryState } from "./contracts"
import { deepFreeze } from "./freeze"
import { type FactoryWrite, labelWrite } from "./github/writes"
import { indexIssues } from "./issue-index"
import { copyIssueKey, keyOf } from "./keys"
import { READY_FOR_HUMAN_LABEL } from "./labels"
import type { ReconciliationPlan } from "./reconciliation-plan"

/** The repository state after this pass's reconciliation decisions are applied. */
export function reconciledState(state: RepositoryState, plan: ReconciliationPlan): RepositoryState {
	const released = releaseKeys(plan)
	const handedOff = new Set(plan.handedOffTickets.map((handoff) => keyOf(handoff.issue)))
	const issues = state.issues.map((issue) => reconcileIssue(issue, released, handedOff))
	return deepFreeze({
		issues,
		liveThreads: state.liveThreads.map(copyIssueKey),
	})
}
function releaseKeys(plan: ReconciliationPlan): ReadonlySet<string> {
	const keys = new Set<string>()
	for (const release of plan.releasedClaims) keys.add(keyOf(release.issue))
	for (const requeue of plan.requeuedTickets) keys.add(keyOf(requeue.issue))
	return keys
}
function reconcileIssue(
	issue: IssueState,
	released: ReadonlySet<string>,
	handedOff: ReadonlySet<string>,
): IssueState {
	const key = keyOf(issue.key)
	const labels = reconciledLabels(issue, key, released, handedOff)
	const { claim, ...rest } = issue
	if (released.has(key)) return { ...rest, labels }
	return claim === undefined ? { ...rest, labels } : { ...rest, labels, claim }
}
function reconciledLabels(
	issue: IssueState,
	key: string,
	released: ReadonlySet<string>,
	handedOff: ReadonlySet<string>,
): readonly string[] {
	let labels = released.has(key)
		? issue.labels.filter((label) => label !== CLAIM_LABEL)
		: [...issue.labels]
	if (handedOff.has(key) && !labels.includes(READY_FOR_HUMAN_LABEL)) {
		labels = [...labels, READY_FOR_HUMAN_LABEL]
	}
	return deepFreeze(labels)
}
/** The label writes that carry out this pass's reconciliation decisions. */
export function reconciliationWrites(
	state: RepositoryState,
	plan: ReconciliationPlan,
): readonly FactoryWrite[] {
	const issues = indexIssues(state.issues)
	const writes: FactoryWrite[] = []
	const removed = new Set<string>()
	for (const release of plan.releasedClaims) removeClaim(release.issue, issues, removed, writes)
	for (const requeue of plan.requeuedTickets) removeClaim(requeue.issue, issues, removed, writes)
	for (const handoff of plan.handedOffTickets) {
		const issue = issues.get(keyOf(handoff.issue))
		if (issue === undefined || issue.labels.includes(READY_FOR_HUMAN_LABEL)) continue
		writes.push(labelWrite(issue.key, READY_FOR_HUMAN_LABEL, true))
	}
	return deepFreeze(writes)
}
function removeClaim(
	issueKey: IssueKey,
	issues: ReadonlyMap<string, IssueState>,
	removed: Set<string>,
	writes: FactoryWrite[],
): void {
	const key = keyOf(issueKey)
	const issue = issues.get(key)
	if (issue === undefined || removed.has(key) || !issue.labels.includes(CLAIM_LABEL)) return
	removed.add(key)
	writes.push(labelWrite(issue.key, CLAIM_LABEL, false))
}
/** The issues whose provider rate-limit backoff has not yet elapsed. */
export function retryWaiters(plan: ReconciliationPlan, nowMs: number): ReadonlySet<string> {
	return new Set(
		plan.requeuedTickets
			.filter((requeue) => nowMs < requeue.retryAtMs)
			.map((requeue) => keyOf(requeue.issue)),
	)
}
/** The repositories that already carry a Claim or a live thread. */
export function busyRepositories(state: RepositoryState): ReadonlySet<string> {
	const repositories = new Set<string>()
	for (const issue of state.issues) {
		if (issue.labels.includes(CLAIM_LABEL)) repositories.add(issue.key.repository)
	}
	for (const issue of state.liveThreads) repositories.add(issue.repository)
	return repositories
}
