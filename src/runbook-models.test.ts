import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const intellectTokens = [
	"claudeAgent",
	"claude-sonnet-5-5",
	"cursor",
	"grok-4.7",
	"antigravity",
	"gemini-4-hydrogen",
	"gemini-4-argon",
] as const

const workerTokens = ["mistral-vibe", "mistral-large-4", "pi", "deepseek-v4.1-flash"] as const

const topLevelRoles = [
	"Spec implementer",
	"Ticket implementer",
	"Spec drafter",
	"Learning author",
	"Next-step finder",
	"Idea screener",
	"Owner assistant",
] as const

const runbookPaths = [
	"docs/dispatcher-runbook.md",
	"docs/learning-runbook.md",
	"docs/next-steps-runbook.md",
] as const

function findIntellectTokens(text: string): string[] {
	return intellectTokens.filter((token) => text.includes(token))
}

function hasWorkerToken(text: string): boolean {
	return workerTokens.some((token) => text.includes(token))
}

describe("top-level thread model rules", () => {
	it("restricts every top-level role in the Models table to worker-tier models only", () => {
		const dispatcher = readFileSync(resolve(root, "docs/dispatcher-runbook.md"), "utf8")
		const lines = dispatcher.split("\n")
		for (const role of topLevelRoles) {
			const row = lines.find((line) => line.startsWith(`| ${role} (`))
			expect(row).toBeDefined()
			expect(hasWorkerToken(row ?? "")).toBe(true)
			expect(findIntellectTokens(row ?? "")).toEqual([])
		}
	})

	it("keeps every top-level modelSelection instruction on worker-tier models only", () => {
		for (const relativePath of runbookPaths) {
			const text = readFileSync(resolve(root, relativePath), "utf8")
			const modelSelectionLines = text
				.split("\n")
				.filter((line) => line.includes("`modelSelection`"))
			expect(modelSelectionLines.length).toBeGreaterThan(0)
			for (const line of modelSelectionLines) {
				expect(hasWorkerToken(line)).toBe(true)
				expect(findIntellectTokens(line)).toEqual([])
			}
		}
	})
})
