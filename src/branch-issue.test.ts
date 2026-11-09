import { describe, expect, it } from "bun:test"
import { issueOfRunBranch } from "./branch-issue"
import { branchNameFor, specBranchNameFor } from "./run-branch"

const REPOSITORY = "trajectonomics/cli"

describe("the issue behind a Run branch", () => {
	it("a Ticket Run branch identifies the issue it works", () => {
		expect(issueOfRunBranch(REPOSITORY, branchNameFor(12, "Add the thing"))).toEqual({
			repository: REPOSITORY,
			number: 12,
		})
	})

	it("a Spec Run branch identifies its Spec", () => {
		expect(issueOfRunBranch(REPOSITORY, specBranchNameFor(3, "A Spec"))).toEqual({
			repository: REPOSITORY,
			number: 3,
		})
	})

	it("the plain branch used when a title leaves no slug still identifies its issue", () => {
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
