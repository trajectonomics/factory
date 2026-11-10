import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const files = ["docs", "docs/adr", "docs/agents"].flatMap((dir) =>
	readdirSync(join(root, dir))
		.filter((name) => name.endsWith(".md"))
		.map((name) => join(dir, name)),
)

/** A launch message is a blockquote that starts `> You are`: the text a launcher pastes into a new thread. */
function launchMessages(file: string): string[] {
	const lines = readFileSync(join(root, file), "utf8").split("\n")
	return lines
		.filter((line) => line.startsWith("> You are"))
		.map((line) => `${file}: ${line.trim()}`)
}

describe("a launch message", () => {
	it("reads a Factory document with gh api, because git show only works in the factory checkout", () => {
		const withGitShow = files
			.flatMap(launchMessages)
			.filter((line) => line.includes("git show origin/main:"))

		expect(withGitShow).toEqual([])
	})
})
