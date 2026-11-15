import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildCheckName, DEPLOY_TARGETS, type DeployTarget } from "./deploy-targets"

const root = resolve(import.meta.dir, "..")

/** The repositories the Dispatcher runbook allows, read from its one allowlist line. */
function allowlisted(): readonly string[] {
	const runbook = readFileSync(resolve(root, "docs/dispatcher-runbook.md"), "utf8")
	const line = runbook
		.split("\n")
		.find((candidate) => candidate.startsWith("Org `trajectonomics`."))
	return [...(line ?? "").matchAll(/`([^`]+)`/g)]
		.map((match) => match[1] ?? "")
		.filter((name) => name !== "trajectonomics")
}

function targetsOf(repository: string): readonly DeployTarget[] {
	return DEPLOY_TARGETS.filter((target) => target.repository === repository)
}

describe("the deploy declaration", () => {
	it("names the Workers Builds check run for every declared Worker", () => {
		for (const target of DEPLOY_TARGETS) {
			expect(target.worker.trim()).not.toBe("")
			expect(buildCheckName(target.worker)).toBe(`Workers Builds: ${target.worker}`)
		}
	})

	it("declares at most one Worker per branch of a repository", () => {
		const branches = DEPLOY_TARGETS.map((target) => `${target.repository}@${target.branch}`)
		expect(new Set(branches).size).toBe(branches.length)
	})

	it("builds staging from main and production from the production branch", () => {
		for (const repository of new Set(DEPLOY_TARGETS.map((target) => target.repository))) {
			const staging = targetsOf(repository).find((target) => target.environment === "staging")
			const production = targetsOf(repository).find((target) => target.environment === "production")
			if (staging === undefined || production === undefined) continue
			expect(staging.branch).toBe("main")
			expect(production.branch).toBe("production")
		}
	})

	it("declares the docs staging Worker from main and production from the production branch", () => {
		expect(targetsOf("docs")).toContainEqual({
			repository: "docs",
			branch: "main",
			worker: "docs-staging",
			environment: "staging",
		})
		expect(targetsOf("docs")).toContainEqual({
			repository: "docs",
			branch: "production",
			worker: "docs",
			environment: "production",
		})
	})

	it("only declares repositories on the Dispatcher allowlist", () => {
		const allowed = allowlisted()
		expect(allowed.length).toBeGreaterThan(0)
		for (const target of DEPLOY_TARGETS) expect(allowed).toContain(target.repository)
	})
})
