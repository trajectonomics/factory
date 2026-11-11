import { NO_SKILL_LOCK, parseSkillLock } from "../skill-lock"
import type { GitHubClient } from "./client"
import type { GhRunner } from "./gh-run"

const LOCK_PATH = "skills-lock.json"
const RAW_ACCEPT = "Accept: application/vnd.github.raw"

/** The lock client: a repository's `skills-lock.json`, said to be missing when GitHub has none. */
export function createGhSkillLockClient(run: GhRunner): Pick<GitHubClient, "readSkillLock"> {
	return {
		readSkillLock: async (repository) => {
			try {
				const content = await run([
					"api",
					`repos/${repository}/contents/${LOCK_PATH}`,
					"-H",
					RAW_ACCEPT,
				])
				return parseSkillLock(content)
			} catch (error) {
				if (error instanceof Error && error.message.includes("HTTP 404")) return NO_SKILL_LOCK
				throw error
			}
		},
	}
}
