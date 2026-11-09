import { describe, expect, it } from "bun:test"
import { DispatchError } from "./dispatch-contracts"
import { planDispatch } from "./dispatch-plan"
import { approved, config, host, key, reading, state } from "./fixtures/dispatch"

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

	it("rejects a reading that names one host twice", () => {
		const error = dispatchError(() =>
			planDispatch(reading({ state: state([approved(4)]), hosts: [host(), host()] }), config()),
		)

		expect(error?.code).toBe("duplicate-host")
		expect(error?.field).toBe("hosts[homeserver2]")
	})
})
describe("host balancing", () => {
	it("places the Run on the host with fewer live Runs, keeping the first on a tie", () => {
		const fewer = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host({ liveRuns: 3 }), host({ host: "homeserver1", liveRuns: 1 })],
			}),
			config(),
		)
		const tie = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host({ liveRuns: 2 }), host({ host: "homeserver1", liveRuns: 2 })],
			}),
			config(),
		)

		expect(fewer.launches[0]?.host).toBe("homeserver1")
		expect(tie.launches[0]?.host).toBe("homeserver2")
	})
})
