import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { lockDifferences, parseSkillLock } from "./skill-lock"
import { REQUIRED_SKILLS } from "./skill-preflight"
import { SKILL_PROFILE } from "./skill-profile"

const root = join(import.meta.dir, "..")
const HASH = /^[0-9a-f]{64}$/

describe("the skills profile", () => {
	it("lists exactly the skills a repository must have", () => {
		expect(Object.keys(SKILL_PROFILE.skills).sort()).toEqual([...REQUIRED_SKILLS].sort())
	})

	it("pins the profile ref and the CLI version its hashes were generated with", () => {
		expect(SKILL_PROFILE).toMatchObject({
			version: "v1.3.2",
			ref: "d1478fcb140db0b93c0c8df17bcfd311844749d0",
			cli: "skills@1.7.6",
		})
	})

	it("records the source and a hash for every required skill", () => {
		for (const skill of REQUIRED_SKILLS) {
			const entry = SKILL_PROFILE.skills[skill]
			expect(entry.source).toBe("mattpocock/skills")
			expect(entry.computedHash).toMatch(HASH)
		}
	})

	it("matches the lock this repository installs, so no repository is flagged by a typo", () => {
		const content = readFileSync(join(root, "skills-lock.json"), "utf8")

		expect(lockDifferences(parseSkillLock(content))).toEqual([])
	})
})
