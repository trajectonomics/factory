// Rendering for the skill plan script
/** Renders plans as numbered, copy-pasteable text: what to run, what to read, what to do next. */
import { deepFreeze } from "../src/freeze"
import type { RefStatus } from "./skill-plan"
import type { SkillPlan } from "./skill-plan-report"

/** The plan as text: run command, files to read, then the ordered next steps. */
export function formatPlan(plan: SkillPlan): string {
	const lines = [
		`skill: ${plan.skill} (${plan.dir})`,
		`source: ${plan.lock ? `${plan.lock.source}, lock ${plan.lock.computedHash.slice(0, 8)}` : "not in skills-lock.json"}`,
		`model invocation: ${plan.frontmatter.disableModelInvocation ? "disabled: read SKILL.md and follow it yourself" : "enabled"}`,
	]
	if (plan.frontmatter.description) lines.push(`description: ${plan.frontmatter.description}`)
	lines.push(`files (${plan.files.length}): ${plan.files.join(", ")}`)
	for (const script of plan.scripts) lines.push(`run: ${script.command}`)
	const byStatus = (status: RefStatus) =>
		plan.refs.filter((r) => r.status === status).map((r) => r.raw)
	lines.push(`read (skill): ${byStatus("local").join(", ") || "-"}`)
	lines.push(`read (repo): ${byStatus("repo").join(", ") || "-"}`)
	const unresolved = byStatus("unresolved")
	if (unresolved.length > 0)
		lines.push(`unresolved (example or cross-repo): ${unresolved.join(", ")}`)
	lines.push("next steps:")
	for (const [i, step] of plan.steps.entries()) lines.push(`  ${i + 1}. ${step}`)
	if (plan.steps.length === 0)
		lines.push("  (no numbered steps in SKILL.md; read it top to bottom)")
	return lines.join("\n")
}

/** One line per skill plus a summary; `failed` is true when any skill cannot be planned. */
export function formatAudit(
	plans: readonly SkillPlan[],
	failures: readonly string[],
): { readonly text: string; readonly failed: boolean } {
	const rows = plans.map((plan) => {
		const unresolved = plan.refs.filter((r) => r.status === "unresolved").length
		const lock = plan.lock ? plan.lock.source.replace("trajectonomics/", "") : "no-lock"
		const invocation = plan.frontmatter.disableModelInvocation ? "off" : "on"
		return `${plan.skill}\tscripts=${plan.scripts.length}\trefs=${plan.refs.length - unresolved}/${plan.refs.length}\tunresolved=${unresolved}\tinvocation=${invocation}\t${lock}`
	})
	const withScripts = plans.filter((p) => p.scripts.length > 0).length
	const summary = `${plans.length} skills, ${withScripts} with bundled scripts, ${failures.length} broken`
	const lines = [...rows, "", summary, ...failures.map((f) => `BROKEN: ${f}`)]
	return deepFreeze({ text: lines.join("\n"), failed: failures.length > 0 })
}
