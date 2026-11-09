import type { DispatchReading } from "./dispatch-contracts"
import type { DispatchDeferral } from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { commentWrite, type FactoryWrite, labelWrite } from "./github/writes"
import { NEEDS_INFO_LABEL } from "./labels"
import { missingSkills } from "./skill-preflight"

const PREFLIGHT_COMMENT_KEY = "preflight:skills"

/** The comment and `needs-info` label for each Run that skill preflight stopped from launching. */
export function preflightWrites(
	deferrals: readonly DispatchDeferral[],
	reading: DispatchReading,
): readonly FactoryWrite[] {
	const writes = deferrals
		.filter((deferral) => deferral.reason === "skills-missing")
		.flatMap(({ issue }) => {
			const missing = missingSkills(reading.skills?.[issue.repository] ?? [])
			const body = `No Run was launched: ${issue.repository} has no ${missing.map((skill) => `\`${skill}\``).join(", ")} under \`.agents/skills\`. Install the skills, then remove \`needs-info\`.`
			return [
				commentWrite(issue, PREFLIGHT_COMMENT_KEY, body),
				labelWrite(issue, NEEDS_INFO_LABEL, true),
			]
		})
	return deepFreeze(writes)
}
