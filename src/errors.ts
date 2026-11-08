/** The inputs an eligibility pass can reject. */
export type EligibilityErrorCode = "duplicate-allowlist-entry" | "duplicate-issue-key"

/** A malformed input to an eligibility pass. */
export class EligibilityError extends Error {
	readonly code: EligibilityErrorCode
	readonly field: string

	constructor(code: EligibilityErrorCode, field: string, message: string) {
		super(message)
		this.name = "EligibilityError"
		this.code = code
		this.field = field
	}
}
