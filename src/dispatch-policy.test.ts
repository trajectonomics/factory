import { describe, expect, it } from "bun:test"
import { DispatchError } from "./dispatch-contracts"
import { planDispatch } from "./dispatch-plan"
import {
	approved,
	config,
	FACTORY,
	host,
	hostThreads,
	key,
	reading,
	state,
	thread,
} from "./fixtures/dispatch"

function dispatchError(run: () => void): DispatchError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof DispatchError ? error : undefined
	}
	return undefined
}

describe("per-repository exclusion", () => {
	it("keeps one Run per repository when the policy asks for it", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4), approved(5)]) }),
			config({ policy: { oneRunPerRepository: true } }),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([{ issue: key(5), reason: "repository-busy" }])
	})
})
describe("per-pass launch pace", () => {
	it("launches no more than the configured number of Runs per pass", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4), approved(5)]) }),
			config({ policy: { oneRunPerRepository: true, maxLaunchesPerPass: 1 } }),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([{ issue: key(5), reason: "launch-pace" }])
	})

	it("rejects an invalid pace", () => {
		const error = dispatchError(() =>
			planDispatch(
				reading({ state: state([approved(4)]) }),
				config({ policy: { oneRunPerRepository: true, maxLaunchesPerPass: 0 } }),
			),
		)

		expect(error?.code).toBe("invalid-launch-pace")
		expect(error?.field).toBe("policy.maxLaunchesPerPass")
	})

	it("places the Run on the host with fewer live threads, keeping the first on a tie", () => {
		const fewer = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host(), host({ host: "homeserver1" })],
				threads: [
					hostThreads({
						threads: [
							thread(),
							thread({ id: "thread-2", title: "triage/trajectonomics/cli#10" }),
							thread({ id: "thread-3", title: "assist/growth-g1" }),
						],
					}),
					hostThreads({ host: "homeserver1", threads: [thread()] }),
				],
			}),
			config(),
		)
		const tie = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host(), host({ host: "homeserver1" })],
				threads: [
					hostThreads({ threads: [thread(), thread({ id: "thread-2" })] }),
					hostThreads({
						host: "homeserver1",
						threads: [thread(), thread({ id: "thread-2" })],
					}),
				],
			}),
			config(),
		)

		expect(fewer.launches[0]?.host).toBe("homeserver1")
		expect(tie.launches[0]?.host).toBe("homeserver2")
	})
})
describe("an unread host", () => {
	it("takes no Run and defers the repository it carries", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4, { key: key(4, FACTORY) })]),
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threads: [hostThreads({ ok: false, error: "connection refused" })],
			}),
			config(),
		)

		expect(plan.launches).toEqual([])
		expect(plan.deferrals).toEqual([{ issue: key(4, FACTORY), reason: "host-unread" }])
	})

	it("leaves a repository it does not carry launcable", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threads: [hostThreads(), hostThreads({ host: "homeserver1", ok: false })],
			}),
			config(),
		)

		expect(plan.launches.map((launch) => launch.host)).toEqual(["homeserver2"])
		expect(plan.deferrals).toEqual([])
	})

	it("is a deferral, not a Guard: it writes nothing on the issue", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threads: [hostThreads({ ok: false, error: "connection refused" })],
			}),
			config(),
		)

		expect(plan.writes).toEqual([])
	})

	it("treats a host with no inventory entry as unread", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4, { key: key(4, FACTORY) })]),
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threads: [hostThreads()],
			}),
			config(),
		)

		expect(plan.deferrals).toEqual([{ issue: key(4, FACTORY), reason: "host-unread" }])
	})
})
describe("the reading's hosts", () => {
	it("rejects two snapshots for one host name", () => {
		const error = dispatchError(() => planDispatch(reading({ hosts: [host(), host()] }), config()))

		expect(error?.code).toBe("duplicate-host")
		expect(error?.field).toBe("hosts")
	})

	it("rejects two inventory entries for one host name", () => {
		const error = dispatchError(() =>
			planDispatch(reading({ threads: [hostThreads(), hostThreads()] }), config()),
		)

		expect(error?.code).toBe("duplicate-host")
		expect(error?.field).toBe("threads")
	})
})
