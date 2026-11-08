import { describe, expect, it } from "bun:test"
import { branchNameFor, slugify } from "./run-branch"

describe("Run branch slugs", () => {
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

	it("returns no slug for a title with no usable characters", () => {
		expect(slugify("!!!")).toBe("")
	})

	it.each(["ทดสอบ", "工場", "🚀"])("returns no slug for %s", (title) => {
		expect(slugify(title)).toBe("")
	})

	it("bounds a long slug and trims a trailing separator", () => {
		expect(slugify("a".repeat(300))).toBe("a".repeat(50))
		expect(slugify(`${"a".repeat(49)} b`)).toBe("a".repeat(49))
	})
})

describe("Run branch names", () => {
	it("names the branch after the issue and its title", () => {
		expect(branchNameFor(8, "T3 adapter")).toBe("factory/8-t3-adapter")
	})

	it("names the branch from the issue alone when the title has no slug", () => {
		expect(branchNameFor(8, "!!!")).toBe("factory/8")
	})

	it.each(["ทดสอบ", "工場", "🚀"])("names the branch from the issue alone for %s", (title) => {
		expect(branchNameFor(8, title)).toBe("factory/8")
	})

	it("keeps the branch component within git's limit for a long title", () => {
		expect(branchNameFor(8, "a".repeat(300))).toBe(`factory/8-${"a".repeat(50)}`)
	})
})
