import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { DEPLOY_CHECK_WAIT_MS } from "./deploy-verify"

const root = resolve(import.meta.dir, "..")
const topLevel = ["README.md", "GLOSSARY.md", "AGENTS.md", "CODING_STANDARDS.md"]
const docs = [...topLevel, ...["docs", "docs/adr", "docs/agents"].flatMap(markdownFiles)]
const deployAdr = "docs/adr/0019-deploy-claims-are-check-runs-and-build-identifiers.md"

function markdownFiles(dir: string): string[] {
	return readdirSync(join(root, dir))
		.filter((name) => name.endsWith(".md"))
		.map((name) => join(dir, name))
}

/**
 * Evidence a deploy claim may name only to reject it. A dashboard screenshot or a deployment
 * timestamp cannot prove which commit is live: a manual deploy and a Workers Builds deploy
 * produce the same timestamp and the same deployment list entry (ADR 0019).
 */
const worthlessEvidence = [
	"dashboard screenshot",
	"deployment timestamp",
	"deployment list",
	"deployments list",
]

/** A paragraph that rejects worthless evidence says so: never, or that it is worthless. */
const rejection = /\b(never|worthless)\b/i

function paragraphs(file: string): readonly string[] {
	return readFileSync(join(root, file), "utf8").split("\n\n")
}

/** The body of one `##` section, up to the next `##` heading. */
function section(file: string, heading: string): string {
	const text = readFileSync(join(root, file), "utf8")
	const start = text.indexOf(heading)
	if (start === -1) return ""
	const next = text.indexOf("\n## ", start + heading.length)
	return text.slice(start, next === -1 ? undefined : next)
}

describe("a deploy claim in the docs", () => {
	it("names a dashboard screenshot, a deployment timestamp or a deployment list only to reject it", () => {
		const offenders = docs.flatMap((file) =>
			paragraphs(file)
				.filter((paragraph) => worthlessEvidence.some((phrase) => paragraph.includes(phrase)))
				.filter((paragraph) => !rejection.test(paragraph))
				.map((paragraph) => `${file}: ${paragraph.replace(/\n/g, " ").trim().slice(0, 140)}`),
		)

		expect(offenders).toEqual([])
	})

	it("records why a timestamp cannot tell a manual deploy from a Workers Builds deploy", () => {
		const adr = readFileSync(join(root, deployAdr), "utf8")

		expect(adr).toContain("Source: Unknown (deployment)")
		expect(adr).toContain("workers/triggered_by: version_upload")
	})

	it("states the evidence rule in each runbook a thread follows", () => {
		for (const file of ["docs/dispatcher-runbook.md", "docs/learning-runbook.md"]) {
			const text = readFileSync(join(root, file), "utf8")
			expect(text).toContain("Workers Builds: <worker>")
			expect(text).toContain("build identifier")
		}
	})
})

describe("the Dispatcher's deploy verification", () => {
	it("declares the file it reads, the check-runs, the bounded wait and the URL phase", () => {
		const body = section("docs/dispatcher-runbook.md", "## Deploy verification")

		expect(body.length).toBeGreaterThan(0)
		expect(body).toContain("src/deploy-targets.ts")
		expect(body).toContain("/check-runs")
		expect(body).toContain("/check-suites")
		expect(body).toContain("Workers Builds: <worker>")
		expect(body).toContain("docs ADR 0007")
		expect(body).toContain("cloudflare-workers-and-pages")
		expect(body).toContain(`${DEPLOY_CHECK_WAIT_MS / 1000} seconds`)
		expect(body).toContain("build.json")
		expect(body).toContain("WORKERS_CI_COMMIT_SHA")
	})

	it("checks every merge it makes and every declared branch tip", () => {
		const pass = section("docs/dispatcher-runbook.md", "## One pass")

		expect(pass).toContain("Deploy verification")
		expect(pass).toContain("src/deploy-targets.ts")
	})
})
