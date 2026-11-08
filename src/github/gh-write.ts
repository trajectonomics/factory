import type { GitHubClient } from "./client"
import type { GhRunner } from "./gh-run"

/** The write half of the GitHub client, over `gh issue edit`, `gh issue comment` and `gh project`. */
export function createGhWriteClient(
	run: GhRunner,
): Pick<GitHubClient, "addLabel" | "removeLabel" | "addComment" | "updateProjectStatus"> {
	return {
		addLabel: async (issue, label) => {
			await run([
				"issue",
				"edit",
				String(issue.number),
				"--repo",
				issue.repository,
				"--add-label",
				label,
			])
		},
		removeLabel: async (issue, label) => {
			await run([
				"issue",
				"edit",
				String(issue.number),
				"--repo",
				issue.repository,
				"--remove-label",
				label,
			])
		},
		addComment: async (issue, body) => {
			await run(
				["issue", "comment", String(issue.number), "--repo", issue.repository, "--body-file", "-"],
				body,
			)
		},
		updateProjectStatus: async (itemId, projectId, fieldId, optionId) => {
			await run([
				"project",
				"item-edit",
				"--id",
				itemId,
				"--project-id",
				projectId,
				"--field-id",
				fieldId,
				"--single-select-option-id",
				optionId,
			])
		},
	}
}
