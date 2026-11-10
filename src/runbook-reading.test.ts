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
