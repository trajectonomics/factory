import type { IssueKey } from "./contracts"
import type { HostReading, HostSnapshot, HostThreads } from "./dispatch-contracts"
import type { UnreadHostReport } from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { keyOf } from "./keys"
import { sortIssueKeys } from "./sort"
import type { T3Thread } from "./t3"
import { isLiveThread, isLiveThreadTitle, liveThreadIssue } from "./t3-threads"

/** The threads of every host that was read, live or settled, in host order. */
export function readThreads(inventory: readonly HostThreads[]): readonly T3Thread[] {
	return Object.freeze(inventory.filter((entry) => entry.ok).flatMap((entry) => entry.threads))
}

/** The issues named by the live threads on every host that was read, once each in issue order. */
export function liveThreadIssues(inventory: readonly HostThreads[]): IssueKey[] {
	const issues = new Map<string, IssueKey>()
	for (const thread of readThreads(inventory)) {
		if (!isLiveThread(thread)) continue
		const issue = liveThreadIssue(thread.title)
		if (issue === undefined) continue
		issues.set(keyOf(issue), issue)
	}
	return deepFreeze(sortIssueKeys([...issues.values()]))
}

/** Every live thread in one host's inventory entry, counted; undefined when it is missing or not ok. */
export function liveCountOf(inventory: readonly HostThreads[], host: string): number | undefined {
	const entry = entryFor(inventory, host)
	return entry === undefined ? undefined : entry.threads.filter(isCountedThread).length
}

/** The live count the pass reports for a host; undefined when the host was not read, unreachable included. */
export function liveCountOfHost(reading: HostReading, host: HostSnapshot): number | undefined {
	return host.reachable ? liveCountOf(reading.threads, host.host) : undefined
}

function entryFor(inventory: readonly HostThreads[], host: string): HostThreads | undefined {
	const entry = inventory.find((candidate) => candidate.host === host)
	return entry?.ok === true ? entry : undefined
}

/** Whether a thread is work the runbook counts on its host: live, under one of the seven prefixes. */
function isCountedThread(thread: T3Thread): boolean {
	return isLiveThread(thread) && isLiveThreadTitle(thread.title)
}

/** The hosts the pass knows whose reading is missing, failed or came from an unreachable host. */
export function unreadHosts(reading: HostReading): readonly HostSnapshot[] {
	return Object.freeze(
		reading.hosts.filter(
			(host) => !host.reachable || entryFor(reading.threads, host.host) === undefined,
		),
	)
}

/** The repositories an unread host carries, whose thread state is therefore unknown to the pass. */
export function atRiskRepositories(reading: HostReading): ReadonlySet<string> {
	const repositories = new Set<string>()
	for (const host of unreadHosts(reading)) {
		for (const repository of host.repositories) repositories.add(repository)
	}
	return repositories
}

/** Each host the pass could not read, with the count of repositories it put at risk. */
export function unreadHostReports(reading: HostReading): readonly UnreadHostReport[] {
	return deepFreeze(
		unreadHosts(reading).map((host) => ({
			host: host.host,
			repositoriesAtRisk: host.repositories.length,
		})),
	)
}
