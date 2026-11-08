import { keyOf } from "../keys"
import type { FactoryWrite } from "./writes"

/** Renders one intended write for dry-run output. */
export function formatWrite(write: FactoryWrite): string {
	const issue = keyOf(write.issue)
	switch (write.kind) {
		case "claim":
			return `claim ${issue} at ${write.claimedAtMs}`
		case "label":
			return write.present
				? `add label "${write.label}" to ${issue}`
				: `remove label "${write.label}" from ${issue}`
		case "status":
			return `set status ${issue} to "${write.status}"`
		case "comment":
			return `comment ${issue} "${write.key}":\n${write.body}`
	}
}
