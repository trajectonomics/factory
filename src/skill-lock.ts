import { deepFreeze } from "./freeze"
import { REQUIRED_SKILLS, type RequiredSkill } from "./skill-preflight"
import { SKILL_PROFILE, type SkillEntry } from "./skill-profile"

/** What reading a repository's `skills-lock.json` found. */
export type SkillLock =
	| { readonly kind: "missing" }
	| { readonly kind: "unreadable" }
	| { readonly kind: "locked"; readonly skills: Readonly<Record<string, SkillEntry>> }

/** A repository has no `skills-lock.json`. */
export const NO_SKILL_LOCK: SkillLock = Object.freeze({ kind: "missing" })

/** A repository's `skills-lock.json` is not a readable skills lock. */
export const UNREADABLE_SKILL_LOCK: SkillLock = Object.freeze({ kind: "unreadable" })

/** One way a repository's lock differs from the curated profile. */
export type SkillLockDifference =
	| { readonly kind: "no-lock" }
	| { readonly kind: "unreadable-lock" }
	| { readonly kind: "no-entry"; readonly skill: RequiredSkill }
	| { readonly kind: "other-source"; readonly skill: RequiredSkill; readonly source: string }
	| {
			readonly kind: "other-hash"
			readonly skill: RequiredSkill
			readonly computedHash: string
	  }

/** The skills lock read from a repository's `skills-lock.json` text, or the reason it cannot be read. */
export function parseSkillLock(content: string): SkillLock {
	// An entry that is not a source and a hash is left out, so an extra entry cannot block a matching lock.
	const value = parseJson(content)
	if (!isObject(value)) return UNREADABLE_SKILL_LOCK
	const entries = value["skills"]
	if (!isObject(entries)) return UNREADABLE_SKILL_LOCK
	const skills: Record<string, SkillEntry> = {}
	for (const [name, entry] of Object.entries(entries)) {
		if (isSkillEntry(entry))
			skills[name] = { source: entry.source, computedHash: entry.computedHash }
	}
	return deepFreeze({ kind: "locked", skills })
}

/** The differences between a lock and the profile, one per required skill in the required order. */
export function lockDifferences(lock: SkillLock): readonly SkillLockDifference[] {
	if (lock.kind === "missing") return deepFreeze([{ kind: "no-lock" } as const])
	if (lock.kind === "unreadable") return deepFreeze([{ kind: "unreadable-lock" } as const])
	return deepFreeze(REQUIRED_SKILLS.flatMap((skill) => skillDifference(skill, lock.skills[skill])))
}

/** The differences between one repository's lock reading and the profile; no reading means no lock. */
export function repositoryLockDifferences(
	skillLocks: Readonly<Record<string, SkillLock>>,
	repository: string,
): readonly SkillLockDifference[] {
	return lockDifferences(skillLocks[repository] ?? NO_SKILL_LOCK)
}

function skillDifference(
	skill: RequiredSkill,
	locked: SkillEntry | undefined,
): readonly SkillLockDifference[] {
	const expected = SKILL_PROFILE.skills[skill]
	if (locked === undefined) return [{ kind: "no-entry", skill }]
	if (locked.source !== expected.source)
		return [{ kind: "other-source", skill, source: locked.source }]
	if (locked.computedHash !== expected.computedHash) {
		return [{ kind: "other-hash", skill, computedHash: locked.computedHash }]
	}
	return []
}

function parseJson(content: string): unknown {
	try {
		return JSON.parse(content)
	} catch {
		return undefined
	}
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSkillEntry(value: unknown): value is SkillEntry {
	return (
		isObject(value) &&
		typeof value["source"] === "string" &&
		typeof value["computedHash"] === "string"
	)
}
