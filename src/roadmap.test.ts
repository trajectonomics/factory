import { describe, expect, it } from "bun:test"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")

const briefs = [
	{
		name: "Spec draft brief",
		file: "docs/dispatcher-runbook.md",
		from: "### Spec draft brief",
		to: "## Nudge the owner",
	},
	{
		name: "Launch brief",
		file: "docs/dispatcher-runbook.md",
		from: "## Launch brief",
		to: "## Scheduled task prompt",
	},
	{
		name: "Learning brief",
		file: "docs/learning-runbook.md",
		from: "## Launch message and brief",
		to: "## Pull request body",
	},
] as const

function read(file: string): string {
	return readFileSync(join(root, file), "utf8")
}

/** The one `--jq` projection the next steps runbook writes for the finder and Screening. */
function roadmapProjection(): string {
	const expression = read("docs/next-steps-runbook.md").match(
		/gh project item-list 1 --owner trajectonomics --limit 500 --format json --jq '([^']+)'/,
	)?.[1]
	if (expression === undefined) throw new Error("the next steps runbook has no Roadmap command")
	return expression
}

/** Runs the runbook's projection on the fixture board, as the finder and Screening run it. */
function roadmapRows(): readonly Record<string, unknown>[] {
	const jq = spawnSync("jq", ["-c", roadmapProjection()], {
		input: read("src/github/fixtures/project-items-roadmap.json"),
		encoding: "utf8",
	})
	if (jq.status !== 0) throw new Error(`jq failed: ${jq.stderr}`)
	return JSON.parse(jq.stdout) as readonly Record<string, unknown>[]
}

/** One runbook section, from its heading to the next one named in `to`. */
function section(file: string, from: string, to: string): string {
	const text = read(file)
	const start = text.indexOf(from)
	const end = text.indexOf(to, start + from.length)
	if (start < 0 || end < 0) throw new Error(`${file} has no section ${from}..${to}`)
	return text.slice(start, end)
}

describe("the Roadmap projection in the next steps runbook", () => {
	it("keeps the roadmap fields of a milestone item and a draft item, and nothing else", () => {
		const rows = roadmapRows()

		expect(rows).toEqual([
			{
				kind: "Issue",
				repository: "trajectonomics/cli",
				milestone: {
					title: "Launch: traj + agent skill",
					description: "Ship the first CLI and skill release.",
					dueOn: "2026-11-23",
				},
				initiative: "CLI + skill",
				targetDate: null,
				startDate: null,
				draftTitle: null,
			},
			{
				kind: "DraftIssue",
				repository: null,
				milestone: null,
				initiative: "Desktop + web app",
				targetDate: "2026-12-10",
				startDate: "2026-11-24",
				draftTitle: "G1 checkpoint (10 Dec 2026)",
			},
		])
	})

	it("never carries Status, a body or a real issue's title", () => {
		const rows = roadmapRows()
		const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort()
		const text = JSON.stringify(rows)

		expect(keys.filter((key) => ["body", "status", "title"].includes(key))).toEqual([])
		expect(text).not.toContain("STRANGER-TITLE")
		expect(text).not.toContain("STRANGER-BODY")
	})

	it("is written once", () => {
		expect(read("docs/next-steps-runbook.md").match(/gh project item-list/g)).toHaveLength(1)
	})
})

describe("the briefs that do not read the Roadmap", () => {
	for (const brief of briefs) {
		it(`${brief.name} does not mention it`, () => {
			expect(section(brief.file, brief.from, brief.to).toLowerCase()).not.toContain("roadmap")
		})
	}
})
