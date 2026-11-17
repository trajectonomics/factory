# ADR 0023: Mobbin is where a Surface ticket finds its visual reference

## Status

Accepted. The owner asked on 2026-11-17 for the Mobbin MCP on every coding agent and to use it to find the blog design: "setup the mobbin MCP for all of our coding agents too and let use it … to find the most similar blog to our design". It amends decision 2 of [ADR 0017](./0017-surface-design-gate.md) and leaves its other decisions as they are.

## Context

ADR 0017 makes a named visual reference mandatory on a Surface ticket, and makes the drafter ask it as an Owner question. It does not say where the reference comes from. On 2026-11-14 the homepage reference was `twenty.com`, which the owner named and a dispatch-generated comment recorded. A reference that exists only because the owner thought of it leaves the owner to supply every one.

Mobbin keeps more than 600,000 real app and website screens and exposes them over MCP at `https://api.mobbin.com/mcp` (Streamable HTTP, OAuth only, Pro, Team or Enterprise plan). Facts this decision relies on, read from Mobbin's documentation on 2026-11-17:

- The tools are `search_screens` (with a deep mode), `search_flows`, `search_sections`, `list_collections`, `get_collection_contents`, `create_collection`, `save_content` and `add_comment`.
- The limits are 60 requests a minute and 500 deep searches a day per user.
- There is no search by image. A query is words.
- Image links expire after 30 days, and the screens belong to third parties.

A headless agent cannot finish Mobbin's browser sign-in, which is why `mcp-auth-gateway` exists ([infra ADR 0008](https://github.com/trajectonomics/infra/blob/main/docs/adr/0008-mcp-auth-gateway-deployment-on-oracle.md)). Its deployment is an owner step ([infra#27](https://github.com/trajectonomics/infra/issues/27)) and had not happened on 2026-11-17. Pi can sign in without a browser on the same host: `pi mcp login` accepts the redirect URL the browser ends on, so the sign-in does not wait for the gateway.

## Decision

1. **Search Mobbin first.** When a Mobbin tool is available in the drafter's thread, the drafter of a Surface ticket describes the intended look in words, searches `search_sections` and `search_screens` for it, and shortlists three to five results. Each shortlisted result is a Mobbin link and one trait to copy. The Owner question of ADR 0017 decision 2 lists the shortlist.
2. **Absence does not block.** When no Mobbin tool is available, the drafter says so in the Owner question and names references the way ADR 0017 already allows. A Spec never waits for Mobbin.
3. **Read-only by default.** `create_collection`, `save_content` and `add_comment` write to the owner's Mobbin account. A drafter or Run uses them only when the owner asked for a collection by name.
4. **Links, never images.** A Spec, a design brief or a pull request records Mobbin links and the collection name. It never commits a Mobbin image: the screens are third-party and the links expire. The screenshots under `docs/screenshots/` that ADR 0017 requires remain renders of our own page.
5. **A vision model judges.** Mobbin returns images. The Surface & Design Review, and the choice among finalists, run on a model that reads images. A Pi session is limited to DeepSeek 4.1 Flash (`AGENTS.md`, rule 7), reads only Mobbin's text and links, and may search but does not decide.
6. **Setup lives in one document, and no MCP configuration is committed.** [`docs/mcp-clients.md`](../mcp-clients.md) lists every client's setup. A committed `.mcp.json` would hold the direct Mobbin URL and would bypass the gateway once it exists, and the Gateway Secret may not be in a workspace file ([infra ADR 0008](https://github.com/trajectonomics/infra/blob/main/docs/adr/0008-mcp-auth-gateway-deployment-on-oracle.md), decision 5).

## Considered Options

- **Commit a project `.mcp.json` pointing at Mobbin.** Rejected: it is one format among seven, it pins the Phase 1 URL, and it tempts the next change to add the secret.
- **Wait for the gateway before touching Mobbin.** Rejected: the gateway is an owner step with no date, and interactive agents and Pi can sign in today.
- **Name the reference from memory, as before.** Rejected: it is the practice ADR 0017 was written against.

## Consequences

- A Surface Spec arrives with a shortlist the owner can open, so the visual Owner question is a choice among real pages and no longer a request for the owner to supply one.
- Each agent signs in to Mobbin separately until the gateway is live. A sign-in is an owner step and a drafter reports it as one.
- Mobbin's 60-a-minute limit is per user, so parallel drafters share it. A drafter that receives a 429 waits for `Retry-After` and does not retry in a loop.
- A Mobbin plan lapse removes the tools. Decision 2 makes that a visible gap in the Owner question, not a failure.
