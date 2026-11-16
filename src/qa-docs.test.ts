import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const read = (path: string) => readFileSync(join(root, path), "utf8")
const runbook = read("docs/qa-runbook.md")

/** The ids in the roster table of docs/personas/README.md, in order. */
function rosterIds(): string[] {
	return [...read("docs/personas/README.md").matchAll(/^\| \[`([a-z-]+)`\]\(\.\/([a-z-]+)\.md\)/gm)]
		.map((match) => match[1] ?? "")
		.filter(Boolean)
}

function personaFiles(): string[] {
	return readdirSync(join(root, "docs/personas"))
		.filter((name) => name.endsWith(".md") && name !== "README.md")
		.map((name) => name.replace(/\.md$/, ""))
}

function countedLines(path: string, prefix: string): number {
	return read(path)
		.split("\n")
		.filter((line) => line.startsWith(prefix)).length
}

describe("the persona roster", () => {
	it("has one file per id in the roster table", () => {
		expect(rosterIds().sort()).toEqual(personaFiles().sort())
	})

	it("gives every persona a Surface and a reason to quit", () => {
		for (const id of personaFiles()) {
			const text = read(`docs/personas/${id}.md`)
			expect(text).toMatch(
				/^\*\*Surfaces:\*\* (docs|site|cli|skills|core)(, (docs|site|cli|skills|core))*$/m,
			)
			expect(text).toContain("## The one thing that makes them quit")
		}
	})
})

describe("the question and task sets", () => {
	it("asks at least 30 questions, each with a literal to grade", () => {
		expect(countedLines("docs/qa-questions.md", "- q:")).toBeGreaterThanOrEqual(30)
		expect(countedLines("docs/qa-questions.md", "  must_contain:")).toBe(
			countedLines("docs/qa-questions.md", "- q:"),
		)
	})

	it("lists exactly the twenty tasks the runbook promises", () => {
		expect(countedLines("docs/qa-tasks.md", "- task:")).toBe(20)
		expect(read("docs/qa-tasks.md")).toContain("Twenty tasks")
	})
})

describe("the paths a thread is told to follow", () => {
	it("sends a QA thread to the section that tells it what to do", () => {
		const threadSection = runbook.indexOf("## The QA thread")
		expect(threadSection).toBeGreaterThan(-1)
		const launchMessage = runbook.indexOf("> You are the Factory QA thread")
		expect(launchMessage).toBeGreaterThan(-1)
		expect(launchMessage).toBeLessThan(threadSection)
		expect(runbook.slice(launchMessage, threadSection)).toContain('"The QA thread"')
		expect(read(".agents/skills/factory-qa/SKILL.md")).toContain('"The QA thread"')
	})

	it("sends the launch check to its own section", () => {
		expect(read(".agents/skills/factory-launch-check/SKILL.md")).toContain('"The launch check"')
		expect(runbook).toContain("## The launch check")
		expect(runbook).toContain("### The launch report")
	})
})

describe("the trigger queries", () => {
	it("fixes twenty expectations, ten of each, before a pass runs them", () => {
		expect(countedLines("docs/qa-trigger-queries.md", "- q:")).toBe(20)
		expect(countedLines("docs/qa-trigger-queries.md", "  expect: trigger")).toBe(10)
		expect(countedLines("docs/qa-trigger-queries.md", "  expect: silent")).toBe(10)
	})
})

describe("the finding labels", () => {
	it("names one label per severity, and the family label every finding carries", () => {
		for (const label of ["`qa`", "`qa-blocker`", "`qa-major`", "`qa-minor`"]) {
			expect(runbook).toContain(label)
		}
	})

	it("never lets a QA pass approve or close", () => {
		expect(runbook).toContain(
			"`ready-for-agent`, `ready-for-human` or `wontfix`, never close an issue",
		)
	})
})
