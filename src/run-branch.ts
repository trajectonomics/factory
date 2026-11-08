import { T3Error } from "./t3-errors"

const SEPARATOR = /[^a-z0-9]+/g
const LEADING_OR_TRAILING_SEPARATOR = /^-+|-+$/g
const COMBINING_MARKS = /\p{M}+/gu

/** Turns a title into a stable, lowercase branch-name slug. */
export function slugify(title: string): string {
	const slug = title
		.normalize("NFKD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(SEPARATOR, "-")
		.replace(LEADING_OR_TRAILING_SEPARATOR, "")
	if (slug === "") {
		throw new T3Error("empty-slug", "title", `The title ${JSON.stringify(title)} has no slug`)
	}
	return slug
}

/** The branch a Run works on: `factory/<issue>-<slug>`. */
export function branchNameFor(issueNumber: number, title: string): string {
	return `factory/${issueNumber}-${slugify(title)}`
}
