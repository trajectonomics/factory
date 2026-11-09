import { deepFreeze } from "../freeze"
import type { GitHubClient } from "./client"

/** The skills installed under `.agents/skills`, by repository. */
export async function readRepositorySkills(
	client: GitHubClient,
	repositories: readonly string[],
): Promise<Readonly<Record<string, readonly string[]>>> {
	const skills: Record<string, readonly string[]> = {}
	for (const repository of repositories) skills[repository] = await client.listSkills(repository)
	return deepFreeze(skills)
}
