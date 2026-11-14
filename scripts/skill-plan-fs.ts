// Filesystem adapter for the skill plan script
/** The only file of the skill plan script that touches disk: skill dirs, their files, the lock. */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { SkillLockEntry } from "./skill-plan-report"

export const SKILLS_DIR = ".agents/skills"

/** The sorted names of the skill dirs under `<root>/.agents/skills`. */
export function skillNames(root: string): string[] {
	return readdirSync(join(root, SKILLS_DIR), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

/** One skill's files (posix, relative to the skill dir), markdown contents and SKILL.md; null without SKILL.md. */
export function readSkill(
	root: string,
	name: string,
): { readonly files: string[]; readonly markdown: string[]; readonly skillMd: string } | null {
	const skillDir = join(root, SKILLS_DIR, name)
	const skillMdPath = join(skillDir, "SKILL.md")
	if (!existsSync(skillMdPath)) return null
	const files = listFiles(skillDir).map((file) => relative(skillDir, file).split(sep).join("/"))
	const markdown = files
		.filter((file) => file.endsWith(".md"))
		.map((file) => readFileSync(join(skillDir, file), "utf8"))
	return { files, markdown, skillMd: readFileSync(skillMdPath, "utf8") }
}

/** Whether a reference resolves to a file at the repo root. */
export function repoFileExists(root: string, ref: string): boolean {
	return existsSync(join(root, ref))
}

/** The `skills-lock.json` entries that carry a source and a hash. */
export function readLock(root: string): Record<string, SkillLockEntry> {
	const path = join(root, "skills-lock.json")
	if (!existsSync(path)) return {}
	const value: unknown = JSON.parse(readFileSync(path, "utf8"))
	const skills = (value as { skills?: unknown }).skills
	if (typeof skills !== "object" || skills === null) return {}
	const lock: Record<string, SkillLockEntry> = {}
	for (const [name, entry] of Object.entries(skills)) {
		if (typeof entry !== "object" || entry === null) continue
		const { source, computedHash } = entry as Record<string, unknown>
		if (typeof source === "string" && typeof computedHash === "string")
			lock[name] = { source, computedHash }
	}
	return lock
}

function listFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name))
}
