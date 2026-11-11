import { describe, expect, it } from "bun:test"
import {
	lockDifferences,
	NO_SKILL_LOCK,
	parseSkillLock,
	repositoryLockDifferences,
	UNREADABLE_SKILL_LOCK,
} from "./skill-lock"
import { SKILL_PROFILE } from "./skill-profile"

const ENTRY = { sourceType: "github", skillPath: "skills/engineering/implement/SKILL.md" }

function lockText(skills: Readonly<Record<string, unknown>>): string {
	return JSON.stringify({ version: 1, skills })
}

function profileSkills(): Record<string, unknown> {
	return {
		implement: { ...SKILL_PROFILE.skills.implement, ...ENTRY },
		tdd: { ...SKILL_PROFILE.skills.tdd, ...ENTRY },
		"code-review": { ...SKILL_PROFILE.skills["code-review"], ...ENTRY },
	}
}

describe("reading a skills lock", () => {
	it("keeps the source and hash of every skill the lock records", () => {
		const content = lockText(profileSkills())

		expect(parseSkillLock(content)).toEqual({ kind: "locked", skills: SKILL_PROFILE.skills })
	})

	it("says so when the content is not JSON", () => {
		expect(parseSkillLock("not a lock")).toEqual(UNREADABLE_SKILL_LOCK)
	})

	it("says so when the content has no skills object", () => {
		expect(parseSkillLock('{"version":1}')).toEqual(UNREADABLE_SKILL_LOCK)
	})

	it("says so when an entry has no hash", () => {
		const content = lockText({ implement: { source: "mattpocock/skills" } })

		expect(parseSkillLock(content)).toEqual(UNREADABLE_SKILL_LOCK)
	})
})

describe("comparing a skills lock with the profile", () => {
	it("finds no difference when every required skill matches, whatever else the lock lists", () => {
		const content = lockText({
			...profileSkills(),
			"ask-matt": { ...ENTRY, ...SKILL_PROFILE.skills.implement },
		})

		expect(lockDifferences(parseSkillLock(content))).toEqual([])
	})

	it("names every required skill the lock has no entry for, in the required order", () => {
		expect(lockDifferences(parseSkillLock(lockText({})))).toEqual([
			{ kind: "no-entry", skill: "implement" },
			{ kind: "no-entry", skill: "tdd" },
			{ kind: "no-entry", skill: "code-review" },
		])
	})

	it("names the source of a skill that comes from somewhere else", () => {
		const content = lockText({
			...profileSkills(),
			implement: { ...SKILL_PROFILE.skills.implement, source: "someone/other" },
		})

		expect(lockDifferences(parseSkillLock(content))).toEqual([
			{ kind: "other-source", skill: "implement", source: "someone/other" },
		])
	})

	it("names the hash of a skill that is another version", () => {
		const other = "a".repeat(64)
		const content = lockText({
			...profileSkills(),
			tdd: { ...SKILL_PROFILE.skills.tdd, computedHash: other },
		})

		expect(lockDifferences(parseSkillLock(content))).toEqual([
			{ kind: "other-hash", skill: "tdd", computedHash: other },
		])
	})

	it("reports a repository that has no lock at all", () => {
		expect(lockDifferences(NO_SKILL_LOCK)).toEqual([{ kind: "no-lock" }])
	})

	it("reports a lock that could not be read", () => {
		expect(lockDifferences(UNREADABLE_SKILL_LOCK)).toEqual([{ kind: "unreadable-lock" }])
	})

	it("treats a repository with no reading as having no lock", () => {
		expect(repositoryLockDifferences({}, "trajectonomics/cli")).toEqual([{ kind: "no-lock" }])
	})

	it("reads the differences of one repository from the reading", () => {
		const reading = {
			"trajectonomics/cli": parseSkillLock(lockText(profileSkills())),
			"trajectonomics/factory": NO_SKILL_LOCK,
		}

		expect(repositoryLockDifferences(reading, "trajectonomics/cli")).toEqual([])
		expect(repositoryLockDifferences(reading, "trajectonomics/factory")).toEqual([
			{ kind: "no-lock" },
		])
	})
})
