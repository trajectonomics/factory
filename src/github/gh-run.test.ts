import { describe, expect, it } from "bun:test"
import { adapterError } from "./fixtures/test-client"
import { runCommand } from "./gh-run"

describe("running a gh invocation", () => {
	it("returns what the command printed", async () => {
		expect(await runCommand("echo", ["ready"], undefined, 5_000)).toBe("ready\n")
	})

	it("feeds the input to the command's stdin", async () => {
		expect(await runCommand("cat", [], "from stdin", 5_000)).toBe("from stdin")
	})

	it("rejects instead of crashing when the command exits before it reads its input", async () => {
		const outcome = await runCommand("sh", ["-c", "exit 0"], "x".repeat(2_000_000), 5_000).then(
			() => "resolved",
			() => "rejected",
		)

		expect(outcome).toBe("rejected")
	})

	it("kills a command that outlives the timeout and reports it", async () => {
		const error = adapterError(
			await runCommand("sleep", ["5"], undefined, 100).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("gh-timed-out")
	})
})
