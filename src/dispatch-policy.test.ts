import { describe, expect, it } from "bun:test"
import { DispatchError } from "./dispatch-contracts"
import { planDispatch } from "./dispatch-plan"
import { approved, CLI, config, FACTORY, host, key, reading, state } from "./fixtures/dispatch"

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

	it("allows several Runs in one repository when the policy is off", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4), approved(5)]) }),
			config({ policy: { oneRunPerRepository: false } }),
		)

		expect(plan.launches).toHaveLength(2)
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

	it("is unlimited when no pace is configured", () => {
		const plan = planDispatch(
			reading({
				state: state([
					approved(4),
					approved(5, { key: key(5, FACTORY) }),
					approved(6, { key: key(6, "trajectonomics/sim-core") }),
				]),
				hosts: [host({ repositories: [CLI, FACTORY, "trajectonomics/sim-core"] })],
			}),
			config({
				allowlist: [
					{ repository: CLI, host: "homeserver2" },
					{ repository: FACTORY, host: "homeserver2" },
					{ repository: "trajectonomics/sim-core", host: "homeserver2" },
				],
				policy: { oneRunPerRepository: false },
			}),
		)

		expect(plan.launches).toHaveLength(3)
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
describe("launch pacing", () => {
	it("spaces two launches in one pass on the same host", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4), approved(5)]) }),
			config({
				policy: { oneRunPerRepository: false },
				thresholds: { ...config().thresholds, launchIntervalMs: 60_000 },
			}),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([{ issue: key(5), reason: "launch-too-soon" }])
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
