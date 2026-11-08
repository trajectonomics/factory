import { describe, expect, it } from "bun:test"
import { branchNameFor, slugify } from "./run-branch"
import { T3Error } from "./t3-errors"

function t3Error(run: () => void): T3Error | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof T3Error ? error : undefined
	}
	return undefined
}

describe("slugify", () => {
	it("turns a title into a branch-name slug", () => {
		expect(slugify("T3 adapter")).toBe("t3-adapter")
	})

	it("collapses punctuation and whitespace into one separator", () => {
		expect(slugify("  Spec Gap: What now?!  ")).toBe("spec-gap-what-now")
	})

	it("strips accents", () => {
		expect(slugify("Crème brûlée")).toBe("creme-brulee")
	})

	it("keeps digits", () => {
		expect(slugify("Fix issue 8")).toBe("fix-issue-8")
	})

	it("returns the same slug for the same title", () => {
		expect(slugify("T3 adapter")).toBe(slugify("T3 adapter"))
	})

	it("rejects a title with no letters or digits", () => {
		const error = t3Error(() => slugify("!!!"))
		expect(error?.code).toBe("empty-slug")
		expect(error?.field).toBe("title")
	})
})

describe("branchNameFor", () => {
	it("names the branch after the issue and its title", () => {
		expect(branchNameFor(8, "T3 adapter")).toBe("factory/8-t3-adapter")
	})
})
