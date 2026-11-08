import { describe, expect, it } from "bun:test"
import type { CreateIssueRequest, CreatePullRequestRequest } from "./create"
import { createGhCliClient, type GhRunner } from "./gh-client"

const FACTORY = "trajectonomics/factory"
const HEAD = "factory/9-ticket-run-end-to-end"

type GhCall = { readonly args: readonly string[]; readonly input?: string }

function runner(responses: Readonly<Record<string, string>>): {
	readonly run: GhRunner
	readonly calls: GhCall[]
} {
	const calls: GhCall[] = []
	const run: GhRunner = async (args, input) => {
		calls.push(input === undefined ? { args: [...args] } : { args: [...args], input })
		const key = args.join(" ")
		const response = responses[key]
		if (response === undefined) throw new Error(`unexpected gh call: ${key}`)
		return response
	}
	return { run, calls }
}

const FOLLOW_UP: CreateIssueRequest = {
	repository: FACTORY,
	title: "Provision the release token",
	body: "Only the owner can create it.",
	labels: ["ready-for-human"],
}

const PULL_REQUEST: CreatePullRequestRequest = {
	repository: FACTORY,
	title: "Ticket Run end to end",
	body: "Closes #9",
	head: HEAD,
	base: "main",
	draft: false,
	labels: ["factory"],
}

describe("the gh creation client", () => {
	it("files a Follow-up Ticket through gh issue create", async () => {
		const gh = runner({
			[`issue create --repo ${FACTORY} --title Provision the release token --body-file - --label ready-for-human`]:
				"https://github.com/trajectonomics/factory/issues/30",
		})
		const client = createGhCliClient(gh.run)

		await client.createIssue(FOLLOW_UP)

		expect(gh.calls[0]?.args).toEqual([
			"issue",
			"create",
			"--repo",
			FACTORY,
			"--title",
			"Provision the release token",
			"--body-file",
			"-",
			"--label",
			"ready-for-human",
		])
		expect(gh.calls[0]?.input).toBe("Only the owner can create it.")
	})

	it("opens a ready pull request for a branch through gh pr create", async () => {
		const gh = runner({
			[`pr create --repo ${FACTORY} --head ${HEAD} --base main --title Ticket Run end to end --body-file - --label factory`]:
				"https://github.com/trajectonomics/factory/pull/30",
		})
		const client = createGhCliClient(gh.run)

		await client.createPullRequest(PULL_REQUEST)

		expect(gh.calls[0]?.args).toEqual([
			"pr",
			"create",
			"--repo",
			FACTORY,
			"--head",
			HEAD,
			"--base",
			"main",
			"--title",
			"Ticket Run end to end",
			"--body-file",
			"-",
			"--label",
			"factory",
		])
		expect(gh.calls[0]?.input).toBe("Closes #9")
	})

	it("opens a draft pull request with the draft flag", async () => {
		const gh = runner({
			[`pr create --repo ${FACTORY} --head ${HEAD} --base main --title Ticket Run end to end --body-file - --draft --label factory`]:
				"https://github.com/trajectonomics/factory/pull/30",
		})
		const client = createGhCliClient(gh.run)

		await client.createPullRequest({ ...PULL_REQUEST, draft: true })

		expect(gh.calls[0]?.args).toContain("--draft")
	})
})
