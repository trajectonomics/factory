import { describe, expect, it } from "bun:test"
import { existsSync, lstatSync, readdirSync, readlinkSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const names = (dir: string) => readdirSync(join(root, dir)).sort()

/** Agents that cannot read `.agents/skills/` natively and get a symlink farm instead. */
const linkedDirs = [".claude/skills", ".vibe/skills"]

describe("skill symlinks for agents that do not read .agents/skills", () => {
	for (const dir of linkedDirs) {
		it(`${dir} links every canonical skill and nothing else`, () => {
			expect(names(dir)).toEqual(names(".agents/skills"))
		})

		it(`${dir} entries are symlinks to ../../.agents/skills/<name> that resolve`, () => {
			for (const name of names(dir)) {
				const path = join(root, dir, name)
				expect(lstatSync(path).isSymbolicLink()).toBe(true)
				expect(readlinkSync(path)).toBe(`../../.agents/skills/${name}`)
				expect(existsSync(join(path, "SKILL.md"))).toBe(true)
			}
		})
	}
})
