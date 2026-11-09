/** The skills a repository must have under `.agents/skills` before a Run launches there. */
export const REQUIRED_SKILLS: readonly string[] = ["implement", "tdd", "code-review"]

/** The required skills that a repository's installed skills lack, in the required order. */
export function missingSkills(installed: readonly string[]): readonly string[] {
	return REQUIRED_SKILLS.filter((skill) => !installed.includes(skill))
}

/** Whether a Run must not launch in the repository; a repository with no listing has no skills. */
export function lacksRequiredSkills(
	skills: Readonly<Record<string, readonly string[]>>,
	repository: string,
): boolean {
	return missingSkills(skills[repository] ?? []).length > 0
}
