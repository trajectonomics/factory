import { execFile } from "node:child_process"

/** Runs one `gh` invocation and returns its stdout. */
export type GhRunner = (args: readonly string[], input?: string) => Promise<string>

const MAX_BUFFER_BYTES = 20 * 1024 * 1024

/** Runs the installed `gh` CLI, which supplies its own authentication. */
export function runGh(args: readonly string[], input?: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(
			"gh",
			[...args],
			{ encoding: "utf8", maxBuffer: MAX_BUFFER_BYTES },
			(error, stdout) => {
				if (error !== null) reject(error)
				else resolve(stdout)
			},
		)
		child.stdin?.end(input ?? "")
	})
}

/** Parses the JSON that one `gh` invocation prints. */
export function getJson<T>(run: GhRunner, args: readonly string[]): Promise<T> {
	return run(args).then((stdout) => JSON.parse(stdout) as T)
}

/** Parses a paginated REST response, whose pages `--slurp` wraps in one array. */
export function getApi<T>(run: GhRunner, path: string): Promise<readonly T[]> {
	return getJson<readonly (readonly T[])[]>(run, ["api", "--paginate", "--slurp", path]).then(
		(pages) => pages.flat(),
	)
}
