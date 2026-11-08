import { describe, expect, it } from "bun:test"
import { CLAIM_LEASE_MS, FACTORY_NAME, PROVIDER_RATE_LIMIT_BACKOFF_MS } from "./index"

describe("FACTORY_NAME", () => {
	it("names the package", () => {
		expect(FACTORY_NAME).toBe("@trajectonomics/factory")
	})
})

describe("CLAIM_LEASE_MS", () => {
	it("is the two-hour Claim Lease", () => {
		expect(CLAIM_LEASE_MS).toBe(7_200_000)
	})
})

describe("PROVIDER_RATE_LIMIT_BACKOFF_MS", () => {
	it("is the fifteen-minute rate-limit backoff", () => {
		expect(PROVIDER_RATE_LIMIT_BACKOFF_MS).toBe(900_000)
	})
})
