import type { DispatchReading } from "./dispatch-contracts"
import type { DispatchDeferral, DispatchDeferralReason } from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { commentWrite, type FactoryWrite, labelWrite } from "./github/writes"
import { NEEDS_INFO_LABEL } from "./labels"
import { repositoryLockDifferences, type SkillLockDifference } from "./skill-lock"
import { missingSkills } from "./skill-preflight"
import { PROFILE_INSTALL_COMMAND, SKILL_PROFILE } from "./skill-profile"

/** The marker key and body of one preflight comment. */
type PreflightComment = {
	readonly key: string
	readonly body: string
}

/** The comment and `needs-info` label for each Run that skill preflight stopped from launching. */
export function preflightWrites(
	deferrals: readonly DispatchDeferral[],
	reading: DispatchReading,
): readonly FactoryWrite[] {
	const writes = deferrals.flatMap(({ issue, reason }) => {
		const comment = preflightComment(reason, issue.repository, reading)
		if (comment === undefined) return []
		return [
			commentWrite(issue, comment.key, comment.body),
			labelWrite(issue, NEEDS_INFO_LABEL, true),
		]
	})
	return deepFreeze(writes)
}

function preflightComment(
	reason: DispatchDeferralReason,
	repository: string,
	reading: DispatchReading,
): PreflightComment | undefined {
	switch (reason) {
		case "skills-missing":
			return { key: "preflight:skills", body: missingSkillsBody(repository, reading) }
		case "skills-lock-mismatch":
			return { key: "preflight:skills-lock", body: lockMismatchBody(repository, reading) }
		default:
			return undefined
	}
}

function missingSkillsBody(repository: string, reading: DispatchReading): string {
	const missing = missingSkills(reading.skills?.[repository] ?? [])
	return `No Run was launched: ${repository} has no ${skillList(missing)} under \`.agents/skills\`. Install the skills, then remove \`needs-info\`.`
}

function lockMismatchBody(repository: string, reading: DispatchReading): string {
	const differences = repositoryLockDifferences(reading.skillLocks ?? {}, repository)
	return [
		`No Run was launched: ${repository} has all three required skills under \`.agents/skills\`, but its \`skills-lock.json\` does not match the curated skills profile (${SKILL_PROFILE.version} at \`${SKILL_PROFILE.ref.slice(0, 7)}\`):`,
		"",
		...differences.map((difference) => `- ${differenceText(difference)}`),
		"",
		`Update the skills with \`${PROFILE_INSTALL_COMMAND}\`, then remove \`needs-info\`.`,
	].join("\n")
}

function differenceText(difference: SkillLockDifference): string {
	switch (difference.kind) {
		case "no-lock":
			return "there is no `skills-lock.json`"
		case "unreadable-lock":
			return "`skills-lock.json` is not a readable skills lock"
		case "no-entry":
			return `\`${difference.skill}\` has no entry in \`skills-lock.json\``
		case "other-source":
			return `\`${difference.skill}\` comes from \`${difference.source}\`, not \`${SKILL_PROFILE.skills[difference.skill].source}\``
		case "other-hash":
			return `\`${difference.skill}\` has hash \`${difference.computedHash}\`, not \`${SKILL_PROFILE.skills[difference.skill].computedHash}\``
	}
}

function skillList(skills: readonly string[]): string {
	return skills.map((skill) => `\`${skill}\``).join(", ")
}
