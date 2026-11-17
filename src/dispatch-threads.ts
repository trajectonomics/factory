import type { IssueKey } from "./contracts"
import type { HostSnapshot, HostThreads } from "./dispatch-contracts"
import type { UnreadHostReport } from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { keyOf } from "./keys"
import { sortIssueKeys } from "./sort"
import type { T3Thread } from "./t3"
import { isLiveThread, isLiveThreadTitle, liveThreadIssue } from "./t3-threads"

/** The threads of every host that was read, live or settled, in host order. */
export function readThreads(inventory: readonly HostThreads[]): readonly T3Thread[] {
	return inventory.filter((entry) => entry.ok).flatMap((entry) => entry.threads)
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

/** Every live thread on one host counted by its title prefix; undefined when that host was not read. */
export function liveCountOf(inventory: readonly HostThreads[], host: string): number | undefined {
	const entry = inventory.find((candidate) => candidate.host === host)
	if (entry === undefined || !entry.ok) return undefined
	return entry.threads.filter(isCountedThread).length
}

/** Whether a thread is work the runbook counts on its host: live, under one of the seven prefixes. */
function isCountedThread(thread: T3Thread): boolean {
	return isLiveThread(thread) && isLiveThreadTitle(thread.title)
}

/** The hosts the pass knows whose reading is missing or failed. */
export function unreadHosts(
	hosts: readonly HostSnapshot[],
	inventory: readonly HostThreads[],
): readonly HostSnapshot[] {
	const read = new Set(inventory.filter((entry) => entry.ok).map((entry) => entry.host))
	return hosts.filter((host) => !read.has(host.host))
}

/** The repositories an unread host carries, whose thread state is therefore unknown to the pass. */
export function atRiskRepositories(
	hosts: readonly HostSnapshot[],
	inventory: readonly HostThreads[],
): ReadonlySet<string> {
	const repositories = new Set<string>()
	for (const host of unreadHosts(hosts, inventory)) {
		for (const repository of host.repositories) repositories.add(repository)
	}
	return repositories
}

/** Each host the pass could not read, with the count of repositories it put at risk. */
export function unreadHostReports(
	hosts: readonly HostSnapshot[],
	inventory: readonly HostThreads[],
): readonly UnreadHostReport[] {
	return deepFreeze(
		unreadHosts(hosts, inventory).map((host) => ({
			host: host.host,
			repositoriesAtRisk: host.repositories.length,
		})),
	)
}
