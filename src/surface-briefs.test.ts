import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const read = (path: string) => readFileSync(join(root, path), "utf8")

const nextSteps = read("docs/next-steps-runbook.md")
const qa = read("docs/qa-runbook.md")
const roster = read("docs/personas/README.md")

/** The five Surfaces, in the one order both runbooks use. */
const surfaces = ["docs", "site", "cli", "skills", "core"] as const

/** The body under a `### <id>` heading, up to the next heading of the same level or higher. */
function subsection(text: string, id: string): string {
	const start = text.indexOf(`### \`${id}\``)
	if (start === -1) return ""
	const rest = text.slice(start)
	const end = rest.slice(1).search(/\n#{1,3} /)
	return (end === -1 ? rest : rest.slice(0, end + 1)).trim()
}

/** The `### <id>` headings of a section, in order. */
function surfaceHeadings(text: string, from: string, to: string): string[] {
	const start = text.indexOf(from)
	const end = text.indexOf(to, start)
	const body = start === -1 ? "" : text.slice(start, end === -1 ? undefined : end)
	return [...body.matchAll(/^### `([a-z]+)`$/gm)].map((match) => match[1] ?? "")
}

function rosterIds(): string[] {
	return [...roster.matchAll(/^\| \[`([a-z-]+)`\]\(\.\//gm)].map((match) => match[1] ?? "")
}

function panelIds(surface: string): string[] {
	const line = subsection(qa, surface).match(/^- Personas: (.+)$/m)?.[1] ?? ""
	return [...line.matchAll(/`([a-z-]+)`/g)].map((match) => match[1] ?? "")
}

describe("the five Surface briefs", () => {
	it("gives every Surface a reader, a target, a test and a deployment line", () => {
		for (const surface of surfaces) {
			const brief = subsection(nextSteps, surface)
			expect(brief.length).toBeGreaterThan(0)
			expect(brief).toContain("**Reader:**")
			expect(brief).toContain("**Target:**")
			expect(brief).toContain("**The test:**")
			expect(brief).toMatch(/^- \*\*`web-router`:\*\*/m)
		}
	})

	it("names the same five Surfaces, in the same order, as the playbooks", () => {
		expect(
			surfaceHeadings(nextSteps, "## The five Surface briefs", "### A Surface's own pass"),
		).toEqual([...surfaces])
		expect(surfaceHeadings(qa, "## The five playbooks", "## The launch check")).toEqual([
			...surfaces,
		])
	})

	it("points each brief at the playbook that measures its target", () => {
		for (const surface of surfaces) {
			expect(subsection(nextSteps, surface)).toContain(`./qa-runbook.md#${surface}`)
		}
	})
})

describe("the Surface table", () => {
	it("lists the five Surfaces, each either scheduled or still in the rotation", () => {
		const rows = [
			...nextSteps.matchAll(/^\| `([a-z]+)` \| ([^|]+) \| `idea\/trajectonomics\/([a-z]+)` \|$/gm),
		]
		expect(rows.map((row) => row[1])).toEqual([...surfaces])
		for (const row of rows) {
			expect(row[2]?.trim()).toMatch(/^(not registered|daily \d{2}:\d{2} Asia\/Bangkok)$/)
			expect(row[3]).toBe(row[1])
		}
	})

	function rotationStep(): string {
		const finder = nextSteps.slice(
			nextSteps.indexOf("## The finder"),
			nextSteps.indexOf("## The five Surface briefs"),
		)
		const start = finder.indexOf("2. **Rotation.**")
		return start === -1 ? "" : finder.slice(start, finder.indexOf("\n3. ", start))
	}

	it("makes the rotation read the table, so a Surface is never left with no pass", () => {
		const rotation = rotationStep()
		expect(rotation).toContain("#a-surfaces-own-pass")
		expect(rotation).toContain("`Task`")
	})
})

describe("the panels", () => {
	it("names at most three Personas per Surface, and every one is on the roster", () => {
		const ids = rosterIds()
		for (const surface of surfaces) {
			const panel = panelIds(surface)
			expect(panel.length).toBeGreaterThan(0)
			expect(panel.length).toBeLessThanOrEqual(3)
			for (const id of panel) expect(ids).toContain(id)
		}
	})
})
