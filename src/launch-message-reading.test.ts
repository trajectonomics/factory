import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const files = ["docs", "docs/adr", "docs/agents"].flatMap((dir) =>
	readdirSync(join(root, dir))
		.filter((name) => name.endsWith(".md"))
		.map((name) => join(dir, name)),
)

/** A launch message is a blockquote in a runbook: the text a launcher pastes into a new thread. */
function blockquoteLines(file: string): string[] {
	const lines = readFileSync(join(root, file), "utf8").split("\n")
	return lines.filter((line) => line.startsWith(">")).map((line) => `${file}: ${line.trim()}`)
}

describe("a launch message", () => {
	it("reads a Factory document with gh api, because its thread works in the target repository's checkout", () => {
		const withGitShow = files
			.flatMap(blockquoteLines)
			.filter((line) => line.includes("git show origin/main:docs/"))

		expect(withGitShow).toEqual([])
	})
})
