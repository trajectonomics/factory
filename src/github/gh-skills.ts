import type { GitHubClient } from "./client"
import { getApi } from "./gh-json"
import type { GhRunner } from "./gh-run"
import { isNamedEntry } from "./gh-shapes"

/** The skills client: the skill folders under a repository's `.agents/skills`, none when it has no such folder. */
export function createGhSkillsClient(run: GhRunner): Pick<GitHubClient, "listSkills"> {
	return {
		listSkills: async (repository) => {
			try {
				const entries = await getApi(
					run,
					`repos/${repository}/contents/.agents/skills`,
					isNamedEntry,
				)
				return entries.filter((entry) => entry.type === "dir").map((entry) => entry.name)
			} catch (error) {
				if (error instanceof Error && error.message.includes("HTTP 404")) return []
				throw error
			}
		},
	}
}
