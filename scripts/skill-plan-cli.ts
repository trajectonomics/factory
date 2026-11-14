// CLI for the skill plan script
/**
 * Reads `.agents/skills` and `skills-lock.json` and prints what to do next for a
 * skill, so a run starts from one command instead of exploratory tool calls.
 *
 *   bun run skill:plan tdd          -> the plan for one skill
 *   bun run skill:audit             -> every skill on one line, exit 1 on breakage
 *   bun run skill:plan tdd --json   -> the plan as JSON
 */
import { parseArgs } from "node:util"
import { classifyReference, extractReferences, type RefStatus } from "./skill-plan"
import { formatAudit, formatPlan } from "./skill-plan-format"
import { readLock, readSkill, repoFileExists, SKILLS_DIR, skillNames } from "./skill-plan-fs"
import { buildPlan, type SkillLockEntry, type SkillPlan } from "./skill-plan-report"

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		args: Bun.argv.slice(2),
		allowPositionals: true,
		options: {
			all: { type: "boolean", default: false },
			json: { type: "boolean", default: false },
			root: { type: "string", default: process.cwd() },
		},
		strict: true,
	})
	const root = values.root
	const lock = readLock(root)
	const names = skillNames(root)
	if (values.all) return runAudit(root, names, lock, values.json)
	const name = positionals[0]
	if (!name)
		throw new Error("usage: bun scripts/skill-plan-cli.ts [--all] [--json] [--root dir] [skill]")
	if (!names.includes(name))
		throw new Error(`no skill "${name}" under ${SKILLS_DIR}; run with --all to list them`)
	const plan = planOne(root, name, lock)
	if (!plan) throw new Error(`${SKILLS_DIR}/${name} has no SKILL.md`)
	console.log(values.json ? JSON.stringify(plan, null, 2) : formatPlan(plan))
}

function runAudit(
	root: string,
	names: readonly string[],
	lock: Readonly<Record<string, SkillLockEntry>>,
	json: boolean,
): void {
	const plans: SkillPlan[] = []
	const failures: string[] = []
	for (const name of names) {
		const plan = planOne(root, name, lock)
		if (plan) plans.push(plan)
		else failures.push(`${SKILLS_DIR}/${name} has no SKILL.md`)
	}
	if (json) console.log(JSON.stringify({ plans, failures }, null, 2))
	else {
		const audit = formatAudit(plans, failures)
		console.log(audit.text)
		if (audit.failed) process.exitCode = 1
	}
}

function planOne(
	root: string,
	name: string,
	lock: Readonly<Record<string, SkillLockEntry>>,
): SkillPlan | null {
	const skill = readSkill(root, name)
	if (!skill) return null
	const statuses: Record<string, RefStatus> = {}
	for (const ref of extractReferences(skill.markdown.join("\n\n"))) {
		statuses[ref] = classifyReference(skill.files.includes(ref), repoFileExists(root, ref))
	}
	return buildPlan({
		skill: name,
		dir: `${SKILLS_DIR}/${name}`,
		skillMd: skill.skillMd,
		markdown: skill.markdown,
		lock: lock[name] ?? null,
		files: skill.files,
		statuses,
	})
}

if (import.meta.main) await main()
