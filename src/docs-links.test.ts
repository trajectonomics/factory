import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const topLevel = ["README.md", "GLOSSARY.md", "AGENTS.md", "CODING_STANDARDS.md"]

function markdownFiles(): string[] {
	const files = topLevel.map((name) => join(root, name))
	for (const dir of ["docs", "docs/adr", "docs/agents"]) {
		for (const name of readdirSync(join(root, dir))) {
			if (name.endsWith(".md")) files.push(join(root, dir, name))
		}
	}
	return files
}

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
function slug(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/`/g, "")
		.replace(/[^a-z0-9 _-]/g, "")
		.trim()
		.replace(/ /g, "-")
}

function anchors(file: string): Set<string> {
	const headings = readFileSync(file, "utf8").match(/^#{1,6} .+$/gm) ?? []
	return new Set(headings.map((line) => slug(line.replace(/^#+ /, ""))))
}

function relativeLinks(file: string): string[] {
	const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "")
	const targets = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? "")
	return targets.filter((target) => !/^[a-z]+:/.test(target))
}

/** True when a relative link points at a missing file or a missing heading. */
function isBroken(file: string, link: string): boolean {
	const [path = "", anchor] = link.split("#")
	const target = path === "" ? file : resolve(dirname(file), path)
	if (!existsSync(target)) return true
	return Boolean(anchor) && target.endsWith(".md") && !anchors(target).has(anchor ?? "")
}

describe("relative links in the Markdown docs", () => {
	for (const file of markdownFiles()) {
		test(`${file.slice(root.length + 1)} links resolve to a file and a heading`, () => {
			expect(relativeLinks(file).filter((link) => isBroken(file, link))).toEqual([])
		})
	}
})
