import { describe, expect, it } from "bun:test"
import { DEPLOY_TARGETS } from "./deploy-targets"
import {
	DEPLOY_CHECK_WAIT_MS,
	type DeployCheckRun,
	type DeployCheckSuite,
	type DeployObservation,
	verifyDeploy,
	WORKERS_BUILDS_APP,
} from "./deploy-verify"

function run(name: string, status: string, conclusion?: string): DeployCheckRun {
	return conclusion === undefined ? { name, status } : { name, status, conclusion }
}

function suite(branch: string, checkRuns: readonly DeployCheckRun[]): DeployCheckSuite {
	return { app: WORKERS_BUILDS_APP, branch, checkRuns }
}

function observation(overrides: Partial<DeployObservation> = {}): DeployObservation {
	return {
		repository: "docs",
		branch: "main",
		commit: "a47bddd",
		suites: [],
		...overrides,
	}
}

const STAGING = "Workers Builds: docs-staging"
const PRODUCTION = "Workers Builds: docs"

describe("a deploy check", () => {
	it("waits at most ninety seconds for the runs it checks", () => {
		expect(DEPLOY_CHECK_WAIT_MS).toBe(90_000)
	})

	it("does not check a repository that declares no deploy", () => {
		const verification = verifyDeploy(
			observation({
				repository: "factory",
				suites: [suite("main", [run(STAGING, "completed", "success")])],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("not-deploying")
		expect(verification.expected).toEqual([])
	})

	it("confirms a main merge whose staging Worker completed successfully and whose production Worker did not run", () => {
		const verification = verifyDeploy(
			observation({ suites: [suite("main", [run(STAGING, "completed", "success")])] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
		expect(verification.expected).toContainEqual({
			environment: "staging",
			worker: "docs-staging",
			checkName: STAGING,
			state: { kind: "built" },
		})
		expect(verification.unexpected).toContainEqual({
			environment: "production",
			worker: "docs",
			checkName: PRODUCTION,
			state: { kind: "missing" },
		})
	})

	it("reports drift when the staging run is absent, which is what 2026-11-15 showed", () => {
		const verification = verifyDeploy(observation({ suites: [suite("main", [])] }), DEPLOY_TARGETS)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "missing" })
	})

	it("reports drift when the staging build failed", () => {
		const verification = verifyDeploy(
			observation({ suites: [suite("main", [run(STAGING, "completed", "failure")])] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "failed", conclusion: "failure" })
	})

	it("reports unconfirmed while the staging build is still queued after the wait", () => {
		const verification = verifyDeploy(
			observation({ suites: [suite("main", [run(STAGING, "queued")])] }),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("unconfirmed")
		expect(verification.expected[0]?.state).toEqual({ kind: "pending", status: "queued" })
	})

	it("reports drift when the production Worker built from main", () => {
		const verification = verifyDeploy(
			observation({
				suites: [
					suite("main", [
						run(STAGING, "completed", "success"),
						run(PRODUCTION, "completed", "success"),
					]),
				],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.unexpected[0]?.state).toEqual({ kind: "built" })
	})

	it("reports unconfirmed while the production Worker is queued from main", () => {
		const verification = verifyDeploy(
			observation({
				suites: [suite("main", [run(STAGING, "completed", "success"), run(PRODUCTION, "queued")])],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("unconfirmed")
	})

	it("ignores a build a suite says another branch triggered on the same commit", () => {
		const verification = verifyDeploy(
			observation({
				suites: [
					suite("main", [run(STAGING, "completed", "success")]),
					suite("production", [run(PRODUCTION, "completed", "success")]),
				],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
		expect(verification.unexpected[0]?.state).toEqual({ kind: "missing" })
	})

	it("reads the newest run when a check name appears more than once", () => {
		const verification = verifyDeploy(
			observation({
				suites: [
					suite("main", [run(STAGING, "completed", "failure")]),
					suite("main", [run(STAGING, "completed", "success")]),
				],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
	})

	it("confirms a production merge against the production branch", () => {
		const verification = verifyDeploy(
			observation({
				branch: "production",
				suites: [suite("production", [run(PRODUCTION, "completed", "success")])],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("confirmed")
		expect(verification.unexpected[0]?.state).toEqual({ kind: "missing" })
	})

	it("ignores a suite from another App even when it uses a Workers Builds name", () => {
		const verification = verifyDeploy(
			observation({
				suites: [
					{
						app: "github-actions",
						branch: "main",
						checkRuns: [run(STAGING, "completed", "success")],
					},
				],
			}),
			DEPLOY_TARGETS,
		)

		expect(verification.verdict).toBe("drift")
		expect(verification.expected[0]?.state).toEqual({ kind: "missing" })
	})

	it("returns a frozen verification", () => {
		const verification = verifyDeploy(observation(), DEPLOY_TARGETS)

		expect(Object.isFrozen(verification)).toBe(true)
		expect(Object.isFrozen(verification.expected)).toBe(true)
	})
})
