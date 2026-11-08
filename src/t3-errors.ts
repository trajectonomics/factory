/** The inputs a T3 adapter operation can reject. */
export type T3ErrorCode = "empty-role-brief" | "unsafe-issue-number"

/** A malformed input to a T3 adapter operation. */
export class T3Error extends Error {
	readonly code: T3ErrorCode
	readonly field: string

	constructor(code: T3ErrorCode, field: string, message: string) {
		super(message)
		this.name = "T3Error"
		this.code = code
		this.field = field
	}
}
