import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")

// Owner rule 2026-11-15 (ADR 0018): top-level threads run DeepSeek only.
const otherModelTokens = [
	"mistral-vibe",
	"mistral-large-4",
	"claudeAgent",
	"claude-sonnet-5-5",
	"cursor",
	"grok-4.7",
	"antigravity",
	"gemini-4-hydrogen",
	"gemini-4-argon",
] as const

// Owner rule 2026-11-15 (ADR 0018): reviews and consults never run on Sonnet or Argon.
const retiredReviewTokens = ["claude-sonnet-5-5", "gemini-4-argon"] as const

// Owner rule 2026-11-21 (ADR 0028): Mistral Vibe is retired, so no runbook routes a review to it.
const retiredProviderTokens = ["mistral-vibe", "mistral-large-4"] as const

const topLevelRoles = [
	"Spec implementer",
	"Ticket implementer",
	"Spec drafter",
	"Learning author",
	"Next-step finder",
	"Idea screener",
	"Owner assistant",
	"QA pass",
	"QA personas",
] as const

const reviewRoles = [
	"Spec consultant",
	"Conformance Review",
	"Standards Review",
	"Learning Conformance Review",
	"Learning Standards Review",
	"Finder reviewers",
	"Screener second view",
	"Launch check second view",
] as const

const runbookPaths = [
	"docs/dispatcher-runbook.md",
	"docs/learning-runbook.md",
	"docs/next-steps-runbook.md",
	"docs/qa-runbook.md",
] as const

function findTokens(text: string, tokens: readonly string[]): string[] {
	return tokens.filter((token) => text.includes(token))
}

describe("top-level thread model rules", () => {
	it("runs every top-level role in the Models table on DeepSeek only", () => {
		const dispatcher = readFileSync(resolve(root, "docs/dispatcher-runbook.md"), "utf8")
		const lines = dispatcher.split("\n")
		for (const role of topLevelRoles) {
			const row = lines.find((line) => line.startsWith(`| ${role} (`))
			expect(row).toBeDefined()
			expect(row).toContain("deepseek-v4.1-flash")
			expect(findTokens(row ?? "", otherModelTokens)).toEqual([])
		}
	})

	it("keeps every top-level modelSelection instruction on DeepSeek only", () => {
		for (const relativePath of runbookPaths) {
			const text = readFileSync(resolve(root, relativePath), "utf8")
			const modelSelectionLines = text
				.split("\n")
				.filter((line) => line.includes("`modelSelection`"))
			expect(modelSelectionLines.length).toBeGreaterThan(0)
			for (const line of modelSelectionLines) {
				expect(line).toContain("deepseek-v4.1-flash")
				expect(findTokens(line, otherModelTokens)).toEqual([])
			}
		}
	})
})

describe("review model rules", () => {
	it("never routes a delegate_task target to a retired model", () => {
		for (const relativePath of runbookPaths) {
			const text = readFileSync(resolve(root, relativePath), "utf8")
			const targetLines = text.split("\n").filter((line) => line.includes("providerInstanceId"))
			expect(targetLines.length).toBeGreaterThan(0)
			for (const line of targetLines) {
				expect(findTokens(line, retiredReviewTokens)).toEqual([])
				expect(findTokens(line, retiredProviderTokens)).toEqual([])
			}
		}
	})

	it("names Mistral only to retire it, never to route work", () => {
		for (const relativePath of runbookPaths) {
			const text = readFileSync(resolve(root, relativePath), "utf8")
			const mentionLines = text
				.split("\n")
				.filter((line) => line.includes("mistral-vibe") || line.includes("mistral-large-4"))
			for (const line of mentionLines) {
				expect(line.toLowerCase()).toMatch(/retire|no longer|removed|gone/)
				expect(line).not.toContain("providerInstanceId")
			}
		}
	})

	it("never routes a fixture or the Gate evidence to a retired model", () => {
		for (const relativePath of [
			"src/fixtures/gate-reviews.ts",
			"src/ticket-run.test.ts",
		] as const) {
			const text = readFileSync(resolve(root, relativePath), "utf8")
			expect(findTokens(text, retiredReviewTokens)).toEqual([])
			expect(findTokens(text, retiredProviderTokens)).toEqual([])
		}
	})

	it("routes the Conformance and Standards reviews to the two ADR 0028 lanes", () => {
		const dispatcher = readFileSync(resolve(root, "docs/dispatcher-runbook.md"), "utf8")
		const lines = dispatcher.split("\n")
		const conformance = lines.find((line) => line.startsWith("| Conformance Review |"))
		expect(conformance).toBeDefined()
		expect(conformance).toContain("`cursor`")
		expect(conformance).toContain("`grok-4.7`")
		const standards = lines.find((line) => line.startsWith("| Standards Review |"))
		expect(standards).toBeDefined()
		expect(standards).toContain("`antigravity`")
		expect(standards).toContain("`gemini-4-hydrogen`")
	})

	it("keeps the review roles in the Models table off Sonnet, Argon and Mistral", () => {
		const dispatcher = readFileSync(resolve(root, "docs/dispatcher-runbook.md"), "utf8")
		const lines = dispatcher.split("\n")
		for (const role of reviewRoles) {
			const row = lines.find(
				(line) => line.startsWith(`| ${role} (`) || line.startsWith(`| ${role} |`),
			)
			expect(row).toBeDefined()
			expect(findTokens(row ?? "", retiredReviewTokens)).toEqual([])
			expect(findTokens(row ?? "", retiredProviderTokens)).toEqual([])
		}
	})
})
