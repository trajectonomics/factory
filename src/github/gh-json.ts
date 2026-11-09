import { GitHubAdapterError } from "./errors"
import type { GhRunner } from "./gh-run"

/** Whether a parsed JSON value has the shape the adapter reads. */
export type ShapeCheck<T> = (value: unknown) => value is T

/** Parses the JSON that one `gh` invocation prints, or rejects a shape the adapter does not read. */
export async function getJson<T>(
	run: GhRunner,
	args: readonly string[],
	isShape: ShapeCheck<T>,
): Promise<T> {
	const field = `gh ${args.slice(0, 2).join(" ")}`
	const value = parse(await run(args), field)
	if (isShape(value)) return value
	throw new GitHubAdapterError(
		"malformed-gh-response",
		field,
		`${field} returned an unexpected shape`,
	)
}

/** Parses a paginated REST response, whose pages `--slurp` wraps in one array. */
export async function getApi<T>(
	run: GhRunner,
	path: string,
	isItem: ShapeCheck<T>,
): Promise<readonly T[]> {
	const pages = await getJson(run, ["api", "--paginate", "--slurp", path], isPages)
	const items = pages.flat()
	if (items.every(isItem)) return items
	throw new GitHubAdapterError(
		"malformed-gh-response",
		`gh api ${path}`,
		`gh api ${path} returned an item of an unexpected shape`,
	)
}

function isPages(value: unknown): value is readonly (readonly unknown[])[] {
	return Array.isArray(value) && value.every(Array.isArray)
}

function parse(stdout: string, field: string): unknown {
	try {
		return JSON.parse(stdout)
	} catch {
		throw new GitHubAdapterError("malformed-gh-response", field, `${field} did not print JSON`)
	}
}
