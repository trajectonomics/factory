/** The lifecycle state of a T3 thread. */
export type T3ThreadStatus =
	| "idle"
	| "preparing"
	| "queued"
	| "starting"
	| "running"
	| "waiting"
	| "completed"
	| "interrupted"
	| "failed"
	| "cancelled"
	| "rolled_back"

/** A thread as listed or launched by the T3 boundary. */
export type T3Thread = {
	readonly id: string
	readonly title: string
	readonly status: T3ThreadStatus
	readonly branch?: string
}

/** The provider and model a Run thread runs on. */
export type T3Model = {
	readonly provider: string
	readonly model: string
}

/** A Run thread launch as the T3 boundary receives it. */
export type T3LaunchRequest = {
	readonly title: string
	readonly branch: string
	readonly prompt: string
	readonly model: T3Model
}

/** The T3 operations the Factory needs, injected at the adapter seam. */
export type T3Client = {
	readonly listThreads: () => Promise<readonly T3Thread[]>
	readonly launchThread: (request: T3LaunchRequest) => Promise<T3Thread>
}
