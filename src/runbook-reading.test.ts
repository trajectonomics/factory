import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const docs = ["docs", "docs/adr", "docs/agents"].flatMap((dir) =>
	readdirSync(join(root, dir))
		.filter((name) => name.endsWith(".md"))
		.map((name) => join(dir, name)),
)
const runbooks = [
	"docs/dispatcher-runbook.md",
	"docs/learning-runbook.md",
	"docs/next-steps-runbook.md",
]

/** A quoted instruction that reads a Factory runbook with `git show`, which works only in the factory checkout. */
function quotedRunbookReads(file: string): string[] {
	const paragraphs = readFileSync(join(root, file), "utf8").split("\n\n")
	return paragraphs
		.filter(
			(paragraph) =>
				paragraph.startsWith(">") &&
				runbooks.some((runbook) => paragraph.includes(`git show origin/main:${runbook}`)),
		)
		.map((paragraph) => `${file}: ${paragraph.replace(/\n/g, " ").trim()}`)
}

describe("a quoted instruction", () => {
	it("reads a Factory runbook with gh api, because git show only works in the factory checkout", () => {
		expect(docs.flatMap(quotedRunbookReads)).toEqual([])
	})
})

/**
 * A runbook line that lists threads with `allProjects` and names no host or project, so it silently
 * answers for one host. On 2026-11-14 such a listing hid a live `assist/` thread on the other host
 * and a pass launched a duplicate for the same group. Listing a thread's own children is the one
 * case that may stay on this host.
 */
function allProjectsWithoutAHostOrProject(file: string): string[] {
	return readFileSync(join(root, file), "utf8")
		.split("\n")
		.filter(
			(line) =>
				line.includes("allProjects") &&
				!line.includes("child") &&
				!line.includes("projectId") &&
				!line.includes("environmentId"),
		)
		.map((line) => `${file}: ${line.trim().slice(0, 120)}`)
}

describe("listing threads", () => {
	it("names a host and a project wherever it lists with allProjects", () => {
		expect(runbooks.flatMap(allProjectsWithoutAHostOrProject)).toEqual([])
	})

	it("states the per-host rule once, naming environmentId and projectId", () => {
		const runbook = readFileSync(join(root, "docs/dispatcher-runbook.md"), "utf8")
		const start = runbook.indexOf("### Listing threads")
		expect(start).toBeGreaterThan(-1)
		const next = runbook.indexOf("\n## ", start)
		const body = runbook.slice(start, next === -1 ? undefined : next)
		expect(body).toContain("environmentId")
		expect(body).toContain("projectId")
		expect(body).toContain("either")
	})
})
