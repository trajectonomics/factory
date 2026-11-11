import { deepFreeze } from "../freeze"
import type { SkillLock } from "../skill-lock"
import type { GitHubClient } from "./client"

/** The skills lock of each repository, by repository. */
export async function readRepositorySkillLocks(
	client: GitHubClient,
	repositories: readonly string[],
): Promise<Readonly<Record<string, SkillLock>>> {
	const locks: Record<string, SkillLock> = {}
	for (const repository of repositories) locks[repository] = await client.readSkillLock(repository)
	return deepFreeze(locks)
}
