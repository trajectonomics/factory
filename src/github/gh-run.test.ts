import { describe, expect, it } from "bun:test"
import { adapterError } from "./fixtures/test-client"
import { runCommand } from "./gh-run"

function codeOf(error: unknown): string {
	if (typeof error !== "object" || error === null || !("code" in error)) return "no code"
	return String(error.code)
}

describe("running a gh invocation", () => {
	it("returns what the command printed", async () => {
		expect(await runCommand("echo", ["ready"], undefined, 5_000)).toBe("ready\n")
	})

	it("feeds the input to the command's stdin", async () => {
		expect(await runCommand("cat", [], "from stdin", 5_000)).toBe("from stdin")
	})

	it("rejects with the stdin failure when the command exits cleanly before it reads its input", async () => {
		const error: unknown = await runCommand(
			"sh",
			["-c", "exit 0"],
			"x".repeat(2_000_000),
			5_000,
		).catch((caught: unknown) => caught)

		expect(["EPIPE", "ERR_STREAM_DESTROYED"]).toContain(codeOf(error))
	})

	it("reports the command's own failure, not the closed stdin, when it exits early with an error", async () => {
		const error: unknown = await runCommand(
			"sh",
			["-c", "echo gh-auth-failed >&2; exit 1"],
			"x".repeat(2_000_000),
			5_000,
		).catch((caught: unknown) => caught)

		expect(String(error)).toContain("gh-auth-failed")
	})

	it("kills a command that outlives the timeout and reports it", async () => {
		const error = adapterError(
			await runCommand("sleep", ["5"], undefined, 100).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("gh-timed-out")
	})
})
