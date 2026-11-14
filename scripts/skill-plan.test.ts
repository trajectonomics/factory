import { describe, expect, it } from "bun:test"
import { classifyReference, extractReferences, extractSteps, parseSkillMd } from "./skill-plan"
import { formatAudit, formatPlan } from "./skill-plan-format"
import { buildPlan, bundledScripts } from "./skill-plan-report"

describe("parseSkillMd", () => {
	it("reads name, description and disable-model-invocation, and keeps the body", () => {
		const md =
			'---\nname: tdd\ndescription: "Test-driven development."\ndisable-model-invocation: true\n---\n\n# TDD\n\nBody\n'
		const parsed = parseSkillMd(md)
		expect(parsed.name).toBe("tdd")
		expect(parsed.description).toBe("Test-driven development.")
		expect(parsed.disableModelInvocation).toBe(true)
		expect(parsed.body).toBe("\n# TDD\n\nBody\n")
	})

	it("treats a file without a frontmatter block as all body", () => {
		const parsed = parseSkillMd("# No frontmatter\n")
		expect(parsed.name).toBeNull()
		expect(parsed.disableModelInvocation).toBe(false)
		expect(parsed.body).toBe("# No frontmatter\n")
	})
})

describe("extractReferences", () => {
	it("collects markdown links and inline-code paths, sorted and deduped", () => {
		const md = "See [tests](tests.md) and `mocking.md`, again [x](./tests.md#anchor)."
		expect(extractReferences(md)).toEqual(["mocking.md", "tests.md"])
	})

	it("skips absolute urls, slash-commands, ref names and directory paths", () => {
		const md = "[site](https://example.com/x.md) `/tdd` `origin/main` `docs/adr/` [a](/implement)"
		expect(extractReferences(md)).toEqual([])
	})

	it("ignores links inside fenced code blocks", () => {
		const md = "Real [doc](GLOSSARY.md).\n```\n[example](./src/billing/GLOSSARY.md)\n```\n"
		expect(extractReferences(md)).toEqual(["GLOSSARY.md"])
	})

	it("keeps repo-rooted paths", () => {
		expect(
			extractReferences("Read `docs/dispatcher-runbook.md` and [adr](docs/adr/0001-x.md)."),
		).toEqual(["docs/adr/0001-x.md", "docs/dispatcher-runbook.md"])
	})
})

describe("classifyReference", () => {
	it("prefers the skill dir, then the repo root, then unresolved", () => {
		expect(classifyReference(true, true)).toBe("local")
		expect(classifyReference(false, true)).toBe("repo")
		expect(classifyReference(false, false)).toBe("unresolved")
	})
})

describe("extractSteps", () => {
	it("takes the numbered list under the run heading, not an earlier list", () => {
		const body =
			"# S\n\n1. decoy\n\n## How to Run\n\n1. first\n2. second\n\n## Other\n\n1. not mine\n"
		expect(extractSteps(body)).toEqual(["first", "second"])
	})

	it("falls back to the first numbered list in the body", () => {
		expect(extractSteps("# S\n\n1. only\n")).toEqual(["only"])
	})

	it("returns nothing when the body has no numbered list", () => {
		expect(extractSteps("# S\n\nJust prose.\n")).toEqual([])
	})
})

describe("bundledScripts", () => {
	it("maps runnable files to commands and skips configs and agent yaml", () => {
		const files = [
			"SKILL.md",
			"agents/openai.yaml",
			"scripts/pick_issue.py",
			"template.sh",
			"dependency-cruiser.config.cjs",
		]
		const scripts = bundledScripts(files, ".agents/skills/wizard")
		expect(scripts).toEqual([
			{
				path: "scripts/pick_issue.py",
				command: "python3 .agents/skills/wizard/scripts/pick_issue.py",
			},
			{ path: "template.sh", command: "bash .agents/skills/wizard/template.sh" },
		])
	})
})

const plan = buildPlan({
	skill: "pick-the-issue",
	dir: ".agents/skills/pick-the-issue",
	skillMd:
		"---\nname: pick-the-issue\ndescription: Pick an issue.\ndisable-model-invocation: true\n---\n\n## How to Run\n\n1. Run the script.\n2. Read the issue.\n",
	markdown: [
		"See [local](SKILL.md) and [repo](docs/dispatcher-runbook.md) and [gone](./src/x/README.md).",
	],
	lock: { source: "trajectonomics/internal-skills", computedHash: "abc123" },
	files: ["SKILL.md", "scripts/pick_issue.py"],
	statuses: {
		"SKILL.md": "local",
		"docs/dispatcher-runbook.md": "repo",
		"src/x/README.md": "unresolved",
	},
})

describe("buildPlan", () => {
	it("assembles refs with statuses, scripts and steps", () => {
		expect(plan.refs).toEqual([
			{ raw: "SKILL.md", status: "local" },
			{ raw: "docs/dispatcher-runbook.md", status: "repo" },
			{ raw: "src/x/README.md", status: "unresolved" },
		])
		expect(plan.scripts).toEqual([
			{
				path: "scripts/pick_issue.py",
				command: "python3 .agents/skills/pick-the-issue/scripts/pick_issue.py",
			},
		])
		expect(plan.steps).toEqual(["Run the script.", "Read the issue."])
		expect(plan.lock?.source).toBe("trajectonomics/internal-skills")
	})
})

describe("formatPlan", () => {
	it("prints the run command, the reads and the numbered next steps", () => {
		const text = formatPlan(plan)
		expect(text).toContain("run: python3 .agents/skills/pick-the-issue/scripts/pick_issue.py")
		expect(text).toContain("read (skill): SKILL.md")
		expect(text).toContain("read (repo): docs/dispatcher-runbook.md")
		expect(text).toContain("unresolved (example or cross-repo): src/x/README.md")
		expect(text).toContain("  1. Run the script.")
		expect(text).toContain("model invocation: disabled")
	})
})

describe("formatAudit", () => {
	it("summarises every skill and flags failures", () => {
		const audit = formatAudit([plan], ["broken-skill has no SKILL.md"])
		expect(audit.failed).toBe(true)
		expect(audit.text).toContain(
			"pick-the-issue\tscripts=1\trefs=2/3\tunresolved=1\tinvocation=off\tinternal-skills",
		)
		expect(audit.text).toContain("1 skills, 1 with bundled scripts, 1 broken")
		expect(audit.text).toContain("BROKEN: broken-skill has no SKILL.md")
	})

	it("passes when nothing is broken", () => {
		expect(formatAudit([plan], []).failed).toBe(false)
	})
})
