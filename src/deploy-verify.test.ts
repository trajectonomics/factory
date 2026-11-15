import { describe, expect, it } from "bun:test"
import { DEPLOY_TARGETS, type DeployTarget } from "./deploy-targets"
import {
	DEPLOY_CHECK_WAIT_MS,
	type DeployCheckRun,
	type DeployObservation,
	verifyDeploy,
} from "./deploy-verify"

function observation(overrides: Partial<DeployObservation> = {}): DeployObservation {
	return {
		repository: "docs",
		branch: "main",
		commit: "a47bddd",
		checkRuns: [],
		...overrides,
	}
}

function run(name: string, status: string, conclusion?: string): DeployCheckRun {
	return conclusion === undefined ? { name, status } : { name, status, conclusion }
}

const DOCS = "Workers Builds: docs"
const RETIRED_STAGING = "Workers Builds: docs-staging"

describe("a deploy check", () => {
	it("waits at most ninety seconds for the runs it checks", () => {
		expect(DEPLOY_CHECK_WAIT_MS).toBe(90_000)
	})

	it("does not check a repository that declares no deploy", () => {
		const verification = verifyDeploy(
			observation({ repository: "factory", checkRuns: [run(DOCS, "completed", "success")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("not-deploying")
		expect(verification.expected).toEqual([])
	})

	it("confirms a main merge whose production Worker completed successfully", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(DOCS, "completed", "success")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
		expect(verification.expected).toEqual([
			{ worker: "docs", checkName: DOCS, state: { kind: "built" } },
		])
	})

	it("reports drift when the docs run is absent, which is what 2026-11-15 showed", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run("Lint, Typecheck, Test & Build", "completed", "success")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "missing" })
	})

	it("does not accept the retired staging Worker as the docs deploy", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(RETIRED_STAGING, "completed", "success")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "missing" })
	})

	it("reports drift when the docs build failed", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(DOCS, "completed", "failure")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "failed", conclusion: "failure" })
	})

	it("reports unconfirmed while the docs build is still queued after the wait", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(DOCS, "queued")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("unconfirmed")
		expect(verification.expected[0]?.state).toEqual({ kind: "pending", status: "queued" })
	})

	it("reads the newest run when the check name appears more than once", () => {
		const verification = verifyDeploy(
			observation({
				checkRuns: [run(DOCS, "completed", "failure"), run(DOCS, "completed", "success")],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
	})

	it("checks a declared Worker by the branch it builds from", () => {
		const targets: readonly DeployTarget[] = [
			{ repository: "docs", branch: "main", worker: "docs" },
			{ repository: "other", branch: "main", worker: "other" },
		]

		expect(
			verifyDeploy(
				observation({ checkRuns: [run("Workers Builds: other", "completed", "success")] }),
				targets,
			).verdict,
		).toBe("drift")
		expect(
			verifyDeploy(
				observation({
					repository: "other",
					checkRuns: [run("Workers Builds: other", "completed", "success")],
				}),
				targets,
			).verdict,
		).toBe("confirmed")
	})

	it("does not check the retired production branch", () => {
		const verification = verifyDeploy(
			observation({ branch: "production", checkRuns: [run(DOCS, "completed", "success")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("not-deploying")
	})

	it("returns a frozen verification", () => {
		const verification = verifyDeploy(observation(), DEPLOY_TARGETS)

		expect(Object.isFrozen(verification)).toBe(true)
		expect(Object.isFrozen(verification.expected)).toBe(true)
	})
})
