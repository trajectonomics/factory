import { describe, expect, it } from "bun:test"
import { NO_SKILL_LOCK, UNREADABLE_SKILL_LOCK } from "../skill-lock"
import { createGhSkillLockClient } from "./gh-skill-lock"

const PATH =
	"api repos/trajectonomics/cli/contents/skills-lock.json -H Accept: application/vnd.github.raw"
const HASH = "a".repeat(64)

describe("reading a repository's skills lock", () => {
	it("returns the source and hash of every skill in the lock", async () => {
		const client = createGhSkillLockClient(async (args) => {
			expect(args.join(" ")).toBe(PATH)
			return JSON.stringify({
				version: 1,
				skills: {
					implement: { source: "mattpocock/skills", computedHash: HASH },
					"ask-matt": { source: "mattpocock/skills", computedHash: HASH },
				},
			})
		})

		expect(await client.readSkillLock("trajectonomics/cli")).toEqual({
			kind: "locked",
			skills: {
				implement: { source: "mattpocock/skills", computedHash: HASH },
				"ask-matt": { source: "mattpocock/skills", computedHash: HASH },
			},
		})
	})

	it("returns no lock for a repository without the file", async () => {
		const client = createGhSkillLockClient(async () => {
			throw new Error("gh: Not Found (HTTP 404)")
		})

		expect(await client.readSkillLock("trajectonomics/cli")).toEqual(NO_SKILL_LOCK)
	})

	it("returns an unreadable lock for content that is not one, without throwing", async () => {
		const client = createGhSkillLockClient(async () => "not a lock")

		expect(await client.readSkillLock("trajectonomics/cli")).toEqual(UNREADABLE_SKILL_LOCK)
	})

	it("does not hide a failure other than a missing file", async () => {
		const client = createGhSkillLockClient(async () => {
			throw new Error("gh: Bad credentials (HTTP 401)")
		})

		await expect(client.readSkillLock("trajectonomics/cli")).rejects.toThrow("HTTP 401")
	})
})
