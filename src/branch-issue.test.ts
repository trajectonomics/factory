import { describe, expect, it } from "bun:test"
import { issueOfRunBranch } from "./branch-issue"
import { branchNameFor, specBranchNameFor } from "./run-branch"

const REPOSITORY = "trajectonomics/cli"

describe("the issue behind a Run branch", () => {
	it("reads a Ticket Run branch", () => {
		expect(issueOfRunBranch(REPOSITORY, branchNameFor(12, "Add the thing"))).toEqual({
			repository: REPOSITORY,
			number: 12,
		})
	})

	it("reads a Spec Run branch", () => {
		expect(issueOfRunBranch(REPOSITORY, specBranchNameFor(3, "A Spec"))).toEqual({
			repository: REPOSITORY,
			number: 3,
		})
	})

	it("reads the plain branch used when a title leaves no slug", () => {
		expect(issueOfRunBranch(REPOSITORY, "factory/9")).toEqual({ repository: REPOSITORY, number: 9 })
	})

	for (const branch of [
		"main",
		"triage/4-x",
		"factory/",
		"factory/x-1",
		"factory/0-x",
		"factory/4x",
	]) {
		it(`names no issue for "${branch}"`, () => {
			expect(issueOfRunBranch(REPOSITORY, branch)).toBeUndefined()
		})
	}
})
