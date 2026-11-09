/** The instant GitHub reported, in milliseconds, or undefined when it is missing or malformed. */
export function instantOf(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const at = Date.parse(value)
	return Number.isFinite(at) ? at : undefined
}
