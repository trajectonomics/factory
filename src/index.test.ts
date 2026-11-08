import { describe, expect, it } from "bun:test"
import { FACTORY_NAME } from "./index"

describe("FACTORY_NAME", () => {
	it("names the package", () => {
		expect(FACTORY_NAME).toBe("@trajectonomics/factory")
	})
})
