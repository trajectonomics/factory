import { execFile } from "node:child_process"
import { GitHubAdapterError } from "./errors"

/** Runs one `gh` invocation and returns its stdout. */
export type GhRunner = (args: readonly string[], input?: string) => Promise<string>

const MAX_BUFFER_BYTES = 20 * 1024 * 1024

/** How long one `gh` invocation may run before the Dispatcher gives up on it. */
export const GH_TIMEOUT_MS = 120_000

/** Runs one command with stdin and a timeout. */
export function runCommand(
	command: string,
	args: readonly string[],
	input: string | undefined,
	timeoutMs: number,
): Promise<string> {
	return new Promise((resolve, reject) => {
		// A closed stdin is reported after the command's own failure, which names the real cause.
		let stdinError: Error | undefined
		const child = execFile(
			command,
			[...args],
			{ encoding: "utf8", maxBuffer: MAX_BUFFER_BYTES, timeout: timeoutMs, killSignal: "SIGKILL" },
			(error, stdout) => {
				if (error?.killed === true) return reject(timedOut(command, args, timeoutMs))
				if (error !== null) return reject(error)
				if (stdinError !== undefined) return reject(stdinError)
				resolve(stdout)
			},
		)
		child.stdin?.on("error", (error) => {
			stdinError = error
		})
		child.stdin?.end(input ?? "")
	})
}

function timedOut(command: string, args: readonly string[], timeoutMs: number): GitHubAdapterError {
	const field = `${command} ${args.slice(0, 2).join(" ")}`
	return new GitHubAdapterError("gh-timed-out", field, `${field} ran longer than ${timeoutMs} ms`)
}

/** Runs the installed `gh` CLI, which supplies its own authentication. */
export function runGh(args: readonly string[], input?: string): Promise<string> {
	return runCommand("gh", args, input, GH_TIMEOUT_MS)
}
