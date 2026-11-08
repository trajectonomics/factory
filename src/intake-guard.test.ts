import { describe, expect, it } from "bun:test"
import { type AuthorAssociation, evaluateIntakeGuard } from "./index"

const TRUSTED: readonly AuthorAssociation[] = ["owner", "member", "collaborator"]
const UNTRUSTED: readonly AuthorAssociation[] = [
	"contributor",
	"first-time-contributor",
	"first-timer",
	"none",
	"mannequin",
]

describe("the trusted-author intake Guard", () => {
	for (const association of TRUSTED) {
		it(`allows Spec pipeline intake for the "${association}" association`, () => {
			expect(evaluateIntakeGuard(association)).toEqual({ allowed: true })
		})
	}

	for (const association of UNTRUSTED) {
		it(`blocks Spec pipeline intake for the "${association}" association`, () => {
			expect(evaluateIntakeGuard(association)).toEqual({
				allowed: false,
				reason: { code: "untrusted-author", association },
			})
		})
	}
})
