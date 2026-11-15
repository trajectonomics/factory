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

	it("reports unconfirmed while the docs build is still running after the wait", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(DOCS, "in_progress")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("unconfirmed")
		expect(verification.expected[0]?.state).toEqual({ kind: "pending", status: "in_progress" })
	})

	it("reports drift when a completed run names no conclusion", () => {
		const verification = verifyDeploy(
			observation({ checkRuns: [run(DOCS, "completed")] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "failed", conclusion: "unknown" })
	})

	it("checks every Worker a commit expects, not just the first", () => {
		const targets: readonly DeployTarget[] = [
			{ repository: "docs", branch: "main", worker: "docs" },
			{ repository: "docs", branch: "main", worker: "docs-preview" },
		]

		expect(
			verifyDeploy(observation({ checkRuns: [run(DOCS, "completed", "success")] }), targets)
				.verdict,
		).toBe("drift")
		expect(
			verifyDeploy(
				observation({
					checkRuns: [
						run(DOCS, "completed", "success"),
						run("Workers Builds: docs-preview", "completed", "success"),
					],
				}),
				targets,
			).verdict,
		).toBe("confirmed")
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

	it("returns a frozen verification, down to the per-Worker checks", () => {
		const verification = verifyDeploy(observation(), DEPLOY_TARGETS)

		expect(Object.isFrozen(verification)).toBe(true)
		expect(Object.isFrozen(verification.expected)).toBe(true)
		expect(Object.isFrozen(verification.expected[0])).toBe(true)
	})
})
