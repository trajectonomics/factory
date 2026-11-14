// Pure core of the skill plan script
/**
 * Parses a skill under `.agents/skills` into the parts a plan needs: frontmatter,
 * the repo-relative paths it names, its ordered steps, and any bundled script.
 * No I/O, no clock, no randomness: `skill-plan-cli.ts` reads the files and passes
 * their contents in, so every function here is deterministic.
 *
 *   bun run skill:plan tdd        -> the plan for one skill
 *   bun run skill:audit           -> every skill on one line, exit 1 on breakage
 *   bun run skill:plan tdd --json -> the plan as JSON
 */
import { deepFreeze } from "../src/freeze"

/** The frontmatter of a SKILL.md, plus the body with the frontmatter block removed. */
export type SkillFrontmatter = {
	readonly name: string | null
	readonly description: string | null
	readonly disableModelInvocation: boolean
	readonly body: string
}

/** Parse the leading `---` block of a SKILL.md; a file without one is all body. */
export function parseSkillMd(markdown: string): SkillFrontmatter {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown)
	if (!match)
		return deepFreeze({
			name: null,
			description: null,
			disableModelInvocation: false,
			body: markdown,
		})
	const fields = parseFields(match[1] ?? "")
	return deepFreeze({
		name: fields["name"] ?? null,
		description: fields["description"] ?? null,
		disableModelInvocation: fields["disable-model-invocation"] === "true",
		body: markdown.slice(match[0].length),
	})
}

/** The `key: value` lines of a frontmatter block, with values trimmed and unquoted. */
function parseFields(block: string): Record<string, string> {
	const fields: Record<string, string> = {}
	for (const line of block.split(/\r?\n/)) {
		const kv = /^([a-z-]+):\s*(.*)$/.exec(line.trim())
		const key = kv?.[1]
		const raw = kv?.[2]
		if (key !== undefined && raw !== undefined) fields[key] = raw.trim().replace(/^["']|["']$/g, "")
	}
	return fields
}

const LINK = /\]\(([^)\s]+)\)/g
const CODE_SPAN = /`([^`\n]+)`/g
const FENCED = /^```[\s\S]*?^```/gm
const ABSOLUTE = /^(?:[a-z]+:|\/)/i
const FILE_SEGMENT = /[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/

/** Every repo-relative path the markdown names, in links or inline code outside code fences, sorted. */
export function extractReferences(markdown: string): string[] {
	const prose = markdown.replace(FENCED, "")
	const refs = new Set<string>()
	for (const re of [LINK, CODE_SPAN]) {
		for (const match of prose.matchAll(re)) {
			const path = normalizeTarget(match[1])
			if (path !== null) refs.add(path)
		}
	}
	return deepFreeze([...refs].sort())
}

/** Normalize one link or code-span target to a repo-relative path, or null when it is not one. */
function normalizeTarget(target: string | undefined): string | null {
	if (target === undefined || ABSOLUTE.test(target)) return null
	const path = (target.split("#")[0] ?? "").replace(/^\.\//, "")
	if (!path || path.includes(" ") || !FILE_SEGMENT.test(path)) return null
	return path
}

/** Where a reference resolves: inside the skill dir, at the repo root, or nowhere. */
export type RefStatus = "local" | "repo" | "unresolved"

/** Classify one reference by which candidate location holds it; the skill dir wins. */
export function classifyReference(localExists: boolean, repoExists: boolean): RefStatus {
	if (localExists) return "local"
	if (repoExists) return "repo"
	return "unresolved"
}

const RUN_HEADING =
	/^#{2,3}\s+.*(?:how to run|how to use|usage|steps|process|workflow|invocation)/im

/** The ordered steps of the skill's run section, or of the first numbered list in the body. */
export function extractSteps(body: string): string[] {
	const prose = body.replace(FENCED, "")
	return deepFreeze(numberedItems(sectionUnder(prose) ?? prose))
}

function sectionUnder(body: string): string | null {
	const lines = body.split(/\r?\n/)
	const start = lines.findIndex((line) => RUN_HEADING.test(line))
	const first = lines[start]
	if (start < 0 || first === undefined) return null
	const level = /^#+/.exec(first)?.[0]?.length ?? 2
	const out: string[] = []
	for (const line of lines.slice(start + 1)) {
		const marks = /^(#+)\s/.exec(line)?.[1]
		if (marks !== undefined && marks.length <= level) break
		out.push(line)
	}
	return out.join("\n")
}

function numberedItems(text: string): string[] {
	const items: string[] = []
	for (const line of text.split(/\r?\n/)) {
		const item = /^\s*\d+\.\s+(.*)$/.exec(line)?.[1]
		if (item !== undefined) items.push(item.trim())
	}
	return items
}
