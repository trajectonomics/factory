const SEPARATOR = /[^a-z0-9]+/g
const LEADING_OR_TRAILING_SEPARATOR = /^-+|-+$/g
const COMBINING_MARKS = /\p{M}+/gu
const MAX_SLUG_LENGTH = 50

/** A stable, lowercase branch-name slug for a title. */
export function slugify(title: string): string {
	const slug = title
		.normalize("NFKD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(SEPARATOR, "-")
		.replace(LEADING_OR_TRAILING_SEPARATOR, "")
	return slug.slice(0, MAX_SLUG_LENGTH).replace(LEADING_OR_TRAILING_SEPARATOR, "")
}

/** The branch a Run works on: `factory/<issue>-<slug>`, or `factory/<issue>` without a slug. */
export function branchNameFor(issueNumber: number, title: string): string {
	const slug = slugify(title)
	return slug === "" ? `factory/${issueNumber}` : `factory/${issueNumber}-${slug}`
}

/** The integration branch a Spec Run works on: `factory/spec-<spec>-<slug>`. */
export function specBranchNameFor(specNumber: number, title: string): string {
	const slug = slugify(title)
	return slug === "" ? `factory/spec-${specNumber}` : `factory/spec-${specNumber}-${slug}`
}
