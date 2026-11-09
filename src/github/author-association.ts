import type { AuthorAssociation } from "../guard-contracts"

const ASSOCIATIONS: Readonly<Record<string, AuthorAssociation>> = {
	OWNER: "owner",
	MEMBER: "member",
	COLLABORATOR: "collaborator",
	CONTRIBUTOR: "contributor",
	FIRST_TIME_CONTRIBUTOR: "first-time-contributor",
	FIRST_TIMER: "first-timer",
	MANNEQUIN: "mannequin",
	NONE: "none",
}

/** The Guard's association for GitHub's `author_association`; a missing or unknown value is `none`. */
export function authorAssociationOf(value: string | undefined): AuthorAssociation {
	if (value === undefined || !Object.hasOwn(ASSOCIATIONS, value)) return "none"
	return ASSOCIATIONS[value] ?? "none"
}
