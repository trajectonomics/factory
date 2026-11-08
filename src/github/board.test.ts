import { describe, expect, it } from "bun:test"
import { readBoard } from "./board"
import type {
	GitHubClient,
	GitHubProjectData,
	GitHubProjectFieldData,
	GitHubProjectItemData,
	ProjectRef,
} from "./client"
import { GitHubAdapterError } from "./errors"
import { loadFixture } from "./fixtures/load"

const PROJECT: ProjectRef = { owner: "trajectonomics", number: 1 }

function client(overrides: Partial<GitHubClient>): GitHubClient {
	const unusedRead = async (): Promise<never> => {
		throw new Error("unexpected read")
	}
	const unusedWrite = async (): Promise<never> => {
		throw new Error("unexpected write")
	}
	return {
		listIssues: unusedRead,
		listBlockers: unusedRead,
		listTimeline: unusedRead,
		listComments: unusedRead,
		getProject: unusedRead,
		listProjectFields: unusedRead,
		listProjectItems: unusedRead,
		addLabel: unusedWrite,
		removeLabel: unusedWrite,
		addComment: unusedWrite,
		updateProjectStatus: unusedWrite,
		...overrides,
	}
}

async function fields(): Promise<readonly GitHubProjectFieldData[]> {
	const response = await loadFixture<{ fields: readonly GitHubProjectFieldData[] }>(
		"project-fields.json",
	)
	return response.fields
}

async function items(): Promise<readonly GitHubProjectItemData[]> {
	const response = await loadFixture<{ items: readonly GitHubProjectItemData[] }>(
		"project-items.json",
	)
	return response.items
}

async function project(): Promise<GitHubProjectData> {
	return loadFixture<GitHubProjectData>("project.json")
}

function adapterError(error: unknown): GitHubAdapterError | undefined {
	return error instanceof GitHubAdapterError ? error : undefined
}

describe("reading the board", () => {
	it("maps the project, Status field and item ids from recorded GitHub responses", async () => {
		const board = await readBoard(
			client({
				getProject: project,
				listProjectFields: fields,
				listProjectItems: items,
			}),
			PROJECT,
		)

		expect(board.projectId).toBe("PVT_kwDOFOg3Is4Bpqr_")
		expect(board.statusFieldId).toBe("PVTSSF_lADOFOg3Is4Bpqr_zhoFPn0")
		expect(board.statusOptionIds).toEqual({
			"In progress": "47fc9ee4",
			"In review": "df73e18b",
			Done: "98236657",
		})
		expect(board.itemIds["trajectonomics/factory#7"]).toBe("PVTI_lADOFOg3Is4Bpqr_zhG7-Ac")
	})

	it("rejects a project without a Status field", async () => {
		const error = adapterError(
			await readBoard(
				client({
					getProject: project,
					listProjectFields: async () => [],
					listProjectItems: items,
				}),
				PROJECT,
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("missing-status-field")
	})

	it("rejects a Status field without every outbound Status option", async () => {
		const withoutDone = (await fields()).map((field): GitHubProjectFieldData => {
			if (field.name !== "Status" || field.options === undefined) return field
			return { ...field, options: field.options.filter((option) => option.name !== "Done") }
		})

		const error = adapterError(
			await readBoard(
				client({
					getProject: project,
					listProjectFields: async () => withoutDone,
					listProjectItems: items,
				}),
				PROJECT,
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("missing-status-option")
		expect(error?.field).toBe("fields[Status].options[Done]")
	})
})
