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

	it("declares one branch per repository, so a commit cannot carry two of its deploys", () => {
		for (const repository of new Set(DEPLOY_TARGETS.map((target) => target.repository))) {
			const branches = new Set(targetsOf(repository).map((target) => target.branch))
			expect(branches.size).toBe(1)
		}
	})

	it("declares the docs production Worker from main and no retired staging Worker", () => {
		expect(targetsOf("docs")).toEqual([{ repository: "docs", branch: "main", worker: "docs" }])
	})

	it("only declares repositories on the Dispatcher allowlist", () => {
		const allowed = allowlisted()
		expect(allowed.length).toBeGreaterThan(0)
		for (const target of DEPLOY_TARGETS) expect(allowed).toContain(target.repository)
	})
})
