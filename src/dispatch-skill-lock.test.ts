import { describe, expect, it } from "bun:test"
import { planDispatch } from "./dispatch-plan"
import { approved, CLI, config, key, matchingLock, reading, state } from "./fixtures/dispatch"
import { NO_SKILL_LOCK, type SkillLock } from "./skill-lock"
import { PROFILE_INSTALL_COMMAND, SKILL_PROFILE } from "./skill-profile"

const ALL = ["implement", "tdd", "code-review"]
const OTHER_HASH = "a".repeat(64)

function lockWith(tddHash: string): SkillLock {
	return {
		kind: "locked",
		skills: {
			...SKILL_PROFILE.skills,
			tdd: { ...SKILL_PROFILE.skills.tdd, computedHash: tddHash },
		},
	}
}

describe("skill lock preflight", () => {
	it("defers a repository whose lock differs, and flags the issue instead", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				skills: { [CLI]: ALL },
				skillLocks: { [CLI]: lockWith(OTHER_HASH) },
			}),
			config(),
		)

		expect(plan.launches).toEqual([])
		expect(plan.claims).toEqual([])
		expect(plan.deferrals).toEqual([{ issue: key(4), reason: "skills-lock-mismatch" }])
		expect(plan.writes).toEqual([
			expect.objectContaining({ kind: "comment", issue: key(4), key: "preflight:skills-lock" }),
			{ kind: "label", issue: key(4), label: "needs-info", present: true },
		])
	})

	it("names the differing skill, what differs and the fix command in the comment", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				skills: { [CLI]: ALL },
				skillLocks: { [CLI]: lockWith(OTHER_HASH) },
			}),
			config(),
		)

		const body = plan.writes[0]?.kind === "comment" ? plan.writes[0].body : ""
		expect(body).toContain("`tdd`")
		expect(body).toContain(OTHER_HASH)
		expect(body).toContain(PROFILE_INSTALL_COMMAND)
	})

	it("flags a repository that has no lock at all", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				skills: { [CLI]: ALL },
				skillLocks: { [CLI]: NO_SKILL_LOCK },
			}),
			config(),
		)

		expect(plan.deferrals).toEqual([{ issue: key(4), reason: "skills-lock-mismatch" }])
		expect(plan.writes[0]).toMatchObject({
			body: expect.stringContaining("no `skills-lock.json`"),
		})
	})

	it("launches in a repository whose lock matches the profile", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				skills: { [CLI]: ALL },
				skillLocks: { [CLI]: matchingLock() },
			}),
			config(),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([])
		expect(plan.writes).toEqual([])
	})

	it("lets a missing skill win over a lock that also differs", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				skills: { [CLI]: ["implement"] },
				skillLocks: { [CLI]: NO_SKILL_LOCK },
			}),
			config(),
		)

		expect(plan.deferrals).toEqual([{ issue: key(4), reason: "skills-missing" }])
		expect(plan.writes).toEqual([
			expect.objectContaining({ kind: "comment", key: "preflight:skills" }),
			{ kind: "label", issue: key(4), label: "needs-info", present: true },
		])
	})

	it("flags only the repository whose lock differs", () => {
		const other = { ...approved(5), key: key(5, "trajectonomics/factory") }
		const plan = planDispatch(
			reading({
				state: state([approved(4), other]),
				skills: { [CLI]: ALL, "trajectonomics/factory": ALL },
				skillLocks: { [CLI]: lockWith(OTHER_HASH), "trajectonomics/factory": matchingLock() },
			}),
			config(),
		)

		expect(plan.launches.map((launch) => launch.request.title)).toEqual([
			"traj/trajectonomics/factory#5",
		])
		expect(plan.deferrals).toEqual([{ issue: key(4), reason: "skills-lock-mismatch" }])
	})

	it("does not apply the lock rule when the reading has no skill listing", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4)]), skillLocks: { [CLI]: NO_SKILL_LOCK } }),
			config(),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([])
		expect(plan.writes).toEqual([])
	})

	it("does not apply the lock rule when the reading has no locks", () => {
		const plan = planDispatch(
			reading({ state: state([approved(4)]), skills: { [CLI]: ALL } }),
			config(),
		)

		expect(plan.launches).toHaveLength(1)
		expect(plan.deferrals).toEqual([])
	})
})
