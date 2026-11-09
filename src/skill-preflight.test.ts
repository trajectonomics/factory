import { describe, expect, it } from "bun:test"
import { lacksRequiredSkills, missingSkills } from "./skill-preflight"

const ALL = ["implement", "tdd", "code-review"]

describe("skill preflight", () => {
	it("finds nothing missing when the repository has every required skill", () => {
		expect(missingSkills([...ALL, "pr"])).toEqual([])
	})

	for (const skill of ALL) {
		it(`names ${skill} when it is the only skill missing`, () => {
			expect(missingSkills(ALL.filter((installed) => installed !== skill))).toEqual([skill])
		})
	}

	it("names every required skill in order when the repository has none", () => {
		expect(missingSkills([])).toEqual(ALL)
	})

	it("stops a repository that has no listing at all", () => {
		expect(lacksRequiredSkills({}, "trajectonomics/cli")).toBe(true)
	})

	it("lets a repository with every required skill launch", () => {
		expect(lacksRequiredSkills({ "trajectonomics/cli": ALL }, "trajectonomics/cli")).toBe(false)
	})
})
