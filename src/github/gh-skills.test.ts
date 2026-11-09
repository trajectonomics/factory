import { describe, expect, it } from "bun:test"
import { createGhSkillsClient } from "./gh-skills"

const PATH = "api --paginate --slurp repos/trajectonomics/cli/contents/.agents/skills"

describe("listing a repository's skills", () => {
	it("returns the skill folder names", async () => {
		const client = createGhSkillsClient(async (args) => {
			expect(args.join(" ")).toBe(PATH)
			return JSON.stringify([
				[
					{ name: "implement", type: "dir" },
					{ name: "tdd", type: "dir" },
				],
			])
		})

		expect(await client.listSkills("trajectonomics/cli")).toEqual(["implement", "tdd"])
	})

	it("does not count a file or a symlink named like a skill", async () => {
		const client = createGhSkillsClient(async () =>
			JSON.stringify([
				[
					{ name: "tdd", type: "file" },
					{ name: "implement", type: "symlink" },
					{ name: "code-review", type: "dir" },
				],
			]),
		)

		expect(await client.listSkills("trajectonomics/cli")).toEqual(["code-review"])
	})

	it("returns none for a repository without the folder", async () => {
		const client = createGhSkillsClient(async () => {
			throw new Error("gh: Not Found (HTTP 404)")
		})

		expect(await client.listSkills("trajectonomics/cli")).toEqual([])
	})

	it("does not hide a failure other than a missing folder", async () => {
		const client = createGhSkillsClient(async () => {
			throw new Error("gh: Bad credentials (HTTP 401)")
		})

		await expect(client.listSkills("trajectonomics/cli")).rejects.toThrow("HTTP 401")
	})
})
