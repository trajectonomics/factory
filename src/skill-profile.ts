import { deepFreeze } from "./freeze"
import type { RequiredSkill } from "./skill-preflight"

/** One skill as the curated profile pins it: its upstream source and the hash at the pinned ref. */
export type ProfileSkill = {
	readonly source: string
	readonly computedHash: string
}

/** The curated skills profile in `trajectonomics/internal-skills` that the required skills must match. */
export type SkillProfile = {
	readonly version: string
	readonly ref: string
	readonly cli: string
	readonly skills: Readonly<Record<RequiredSkill, ProfileSkill>>
}

/** The command that installs the profile's pinned skills into a repository. */
export const PROFILE_INSTALL_COMMAND: string =
	"npx -y --package=github:trajectonomics/internal-skills#main install-skills-profile"

/**
 * The pin in `internal-skills/profiles/factory.json`, read by installing the three skills at its ref with
 * `skills@1.7.6 experimental_sync`. Bump it in one Factory pull request, as `docs/skill-preflight.md` describes.
 */
export const SKILL_PROFILE: SkillProfile = deepFreeze({
	version: "v1.3.2",
	ref: "d1478fcb140db0b93c0c8df17bcfd311844749d0",
	cli: "skills@1.7.6",
	skills: {
		implement: {
			source: "mattpocock/skills",
			computedHash: "b6371a0a6723bad551f3adc721e3729a6a97acfc3670dc2bdea198bbe78408c0",
		},
		tdd: {
			source: "mattpocock/skills",
			computedHash: "daf55026f456af104a72fa43247f7bcec89e5127316dc5b1b8d675d6a9d8ce94",
		},
		"code-review": {
			source: "mattpocock/skills",
			computedHash: "c2745e2be960b82b9fddd82cf45265f42431e7b045c403f297b25f0f311e9210",
		},
	},
})
