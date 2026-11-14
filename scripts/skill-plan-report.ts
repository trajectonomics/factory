// Plan assembly for the skill plan script
/**
 * Assembles one skill's plan from already-read data: frontmatter, references,
 * bundled scripts and ordered steps. Pure and deterministic; the filesystem
 * lives in `skill-plan-fs.ts`, the rendering in `skill-plan-format.ts`.
 */
import { deepFreeze } from "../src/freeze"
import {
	extractReferences,
	extractSteps,
	parseSkillMd,
	type RefStatus,
	type SkillFrontmatter,
} from "./skill-plan"

/** A runnable file bundled in the skill, with the command that runs it from the repo root. */
export type BundledScript = { readonly path: string; readonly command: string }

const RUNNERS: Readonly<Record<string, string>> = {
	".py": "python3",
	".sh": "bash",
	".ts": "bun",
	".js": "bun",
}
const RUNNABLE = /\.(py|sh|ts|js)$/

/** Every bundled script in the skill, sorted by path; `dir` is the repo-relative skill dir. */
export function bundledScripts(files: readonly string[], dir: string): BundledScript[] {
	const scripts = files
		.filter((file) => RUNNABLE.test(file) && !file.includes(".config."))
		.sort()
		.map((file) => {
			const ext = file.slice(file.lastIndexOf("."))
			return deepFreeze({ path: file, command: `${RUNNERS[ext]} ${dir}/${file}` })
		})
	return deepFreeze(scripts)
}

/** One entry of `skills-lock.json` for the skill. */
export type SkillLockEntry = { readonly source: string; readonly computedHash: string }

/** Everything the plan for one skill says. */
export type SkillPlan = {
	readonly skill: string
	readonly dir: string
	readonly frontmatter: SkillFrontmatter
	readonly lock: SkillLockEntry | null
	readonly files: readonly string[]
	readonly scripts: readonly BundledScript[]
	readonly refs: readonly { readonly raw: string; readonly status: RefStatus }[]
	readonly steps: readonly string[]
}

/** Assemble one skill's plan; every list is sorted and the result is frozen. */
export function buildPlan(input: {
	skill: string
	dir: string
	skillMd: string
	markdown: readonly string[]
	lock: SkillLockEntry | null
	files: readonly string[]
	statuses: Readonly<Record<string, RefStatus>>
}): SkillPlan {
	const frontmatter = parseSkillMd(input.skillMd)
	const refs = extractReferences([...input.markdown, frontmatter.body].join("\n\n")).map((raw) =>
		deepFreeze({ raw, status: input.statuses[raw] ?? "unresolved" }),
	)
	return deepFreeze({
		skill: input.skill,
		dir: input.dir,
		frontmatter,
		lock: input.lock,
		files: deepFreeze([...input.files].sort()),
		scripts: bundledScripts(input.files, input.dir),
		refs: deepFreeze(refs),
		steps: extractSteps(frontmatter.body),
	})
}
