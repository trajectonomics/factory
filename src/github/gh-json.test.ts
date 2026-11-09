import { describe, expect, it } from "bun:test"
import { adapterError } from "./fixtures/test-client"
import { getApi, getJson } from "./gh-json"
import type { GhRunner } from "./gh-run"
import { isIssueData } from "./gh-shapes"

function printing(stdout: string): GhRunner {
	return async () => stdout
}

function isNamed(value: unknown): value is { readonly name: string } {
	return typeof value === "object" && value !== null && "name" in value
}

async function code(promise: Promise<unknown>): Promise<string | undefined> {
	return adapterError(await promise.catch((caught: unknown) => caught))?.code
}

describe("reading JSON from gh", () => {
	it("returns a value of the expected shape", async () => {
		expect(await getJson(printing('{"name":"x"}'), ["project", "view"], isNamed)).toEqual({
			name: "x",
		})
	})

	it("rejects output that is not JSON", async () => {
		expect(await code(getJson(printing("not json"), ["project", "view"], isNamed))).toBe(
			"malformed-gh-response",
		)
	})

	it("rejects JSON of another shape", async () => {
		expect(await code(getJson(printing('{"title":"x"}'), ["project", "view"], isNamed))).toBe(
			"malformed-gh-response",
		)
	})

	it("flattens the pages of a paginated response", async () => {
		const pages = '[[{"name":"a"}],[{"name":"b"}]]'

		expect(await getApi(printing(pages), "repos/x/y/z", isNamed)).toHaveLength(2)
	})

	it("rejects a paginated response that is not a list of pages", async () => {
		expect(await code(getApi(printing('{"message":"Not Found"}'), "repos/x/y/z", isNamed))).toBe(
			"malformed-gh-response",
		)
	})

	it("rejects a page item of another shape", async () => {
		expect(await code(getApi(printing('[[{"number":"seven"}]]'), "repos/x/y/z", isIssueData))).toBe(
			"malformed-gh-response",
		)
	})
})
