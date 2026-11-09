import { describe, expect, it } from "bun:test"
import type { AuthorAssociation } from "../guard-contracts"
import { authorAssociationOf } from "./author-association"

const MAPPED: readonly (readonly [string, AuthorAssociation])[] = [
	["OWNER", "owner"],
	["MEMBER", "member"],
	["COLLABORATOR", "collaborator"],
	["CONTRIBUTOR", "contributor"],
	["FIRST_TIME_CONTRIBUTOR", "first-time-contributor"],
	["FIRST_TIMER", "first-timer"],
	["MANNEQUIN", "mannequin"],
	["NONE", "none"],
]

describe("mapping GitHub's author association", () => {
	for (const [github, association] of MAPPED) {
		it(`maps ${github} to "${association}"`, () => {
			expect(authorAssociationOf(github)).toBe(association)
		})
	}

	it("fails closed on a value GitHub adds later", () => {
		expect(authorAssociationOf("SPONSOR")).toBe("none")
	})

	it("fails closed when GitHub reports no association", () => {
		expect(authorAssociationOf(undefined)).toBe("none")
	})

	it("fails closed on a name that only exists on the object prototype", () => {
		expect(authorAssociationOf("constructor")).toBe("none")
	})
})
