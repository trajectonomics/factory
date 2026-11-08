import { readFile } from "node:fs/promises"

/** Loads one recorded GitHub response from the fixtures directory. */
export async function loadFixture<T>(name: string): Promise<T> {
	const text = await readFile(new URL(name, import.meta.url), "utf8")
	return JSON.parse(text) as T
}
