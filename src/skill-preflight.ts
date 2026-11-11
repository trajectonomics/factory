/** One skill a repository must have under `.agents/skills`. */
export type RequiredSkill = "implement" | "tdd" | "code-review"

/** The skills a repository must have under `.agents/skills`, and whose lock entries the profile must match. */
export const REQUIRED_SKILLS: readonly RequiredSkill[] = Object.freeze([
	"implement",
	"tdd",
	"code-review",
])

/** The required skills that a repository's installed skills lack, in the required order. */
export function missingSkills(installed: readonly string[]): readonly string[] {
	return Object.freeze(REQUIRED_SKILLS.filter((skill) => !installed.includes(skill)))
}

/** Whether a Run must not launch in the repository; a repository with no listing has no skills. */
export function lacksRequiredSkills(
	skills: Readonly<Record<string, readonly string[]>>,
	repository: string,
): boolean {
	return missingSkills(skills[repository] ?? []).length > 0
}
