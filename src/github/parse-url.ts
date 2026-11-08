import { GitHubAdapterError } from "./errors"

/** Reads `owner/name` from a GitHub API or web issue URL, naming the caller's field on failure. */
export function repositoryFromUrl(
	url: string,
	field: string,
	code: "malformed-issue-url" | "malformed-parent-url" = "malformed-issue-url",
): string {
	const match = /(?:api\.github\.com\/repos|github\.com)\/([^/]+)\/([^/?#]+)/.exec(url)
	if (match === null) {
		throw new GitHubAdapterError(
			code,
			field,
			`GitHub returned an issue URL without a repository: ${url}`,
		)
	}
	return `${match[1]}/${match[2]}`
}

/** Reads the issue number from a GitHub issue URL, naming the caller's field on failure. */
export function issueNumberFromUrl(url: string, field: string): number {
	const match = /\/issues\/(\d+)\/?$/.exec(url)
	const number = match?.[1]
	if (number === undefined) {
		throw new GitHubAdapterError(
			"malformed-parent-url",
			field,
			`GitHub returned a parent URL without an issue number: ${url}`,
		)
	}
	return Number(number)
}
