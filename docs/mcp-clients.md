# MCP clients: Mobbin

How each coding agent reaches the Mobbin MCP, and how to check it. Why Mobbin and what a thread may do with it: [ADR 0023](./adr/0023-mobbin-is-where-a-surface-ticket-finds-its-visual-reference.md). Language is in [`GLOSSARY.md`](../GLOSSARY.md).

Nothing here holds a secret, and no MCP configuration is committed to any repository. Each setting below is **user-level**, on the machine that runs the agent.

## The server

| | |
| --- | --- |
| URL | `https://api.mobbin.com/mcp` |
| Transport and auth | Streamable HTTP, OAuth. It needs a Mobbin Pro, Team or Enterprise plan. |
| Tools | `search_screens` (deep mode available), `search_flows`, `search_sections`, `list_collections`, `get_collection_contents`, `create_collection`, `save_content`, `add_comment` |
| Limits | 60 requests a minute and 500 deep searches a day, per user. Over the first it answers 429 with `Retry-After`; over the second `search_screens` returns an error that says when it resets. |
| Not offered | Search by image. Queries are words. |
| Images | A result has a preview and a high-resolution link that expires after 30 days. |

## Two routes

**Phase 1, now: each agent signs in to Mobbin itself.** The owner signs in once per agent in a browser. It works for every agent below that can finish an OAuth sign-in on its machine.

**Phase 2, when the gateway is live: one route for every agent.** [`mcp-auth-gateway`](https://github.com/trajectonomics/mcp-auth-gateway) holds the one Mobbin sign-in and rotates its token, so an agent that cannot open a browser still reaches Mobbin. Each client then points at `https://<gateway-name>/mobbin/mcp` and sends `Authorization: Bearer <Gateway Secret>`. The Gateway Secret goes only in that client's user-level file, never in Git or a workspace file ([infra ADR 0008](https://github.com/trajectonomics/infra/blob/main/docs/adr/0008-mcp-auth-gateway-deployment-on-oracle.md)). The deployment is owner-run ([infra#27](https://github.com/trajectonomics/infra/issues/27)), and its runbook is [`deploy-mcp-auth-gateway.md`](https://github.com/trajectonomics/infra/blob/main/docs/runbooks/deploy-mcp-auth-gateway.md). When it is live, replace each Phase 1 entry below with the Phase 2 one and run the same check.

## Setup by agent

"Confirmed" means the setting was applied and listed on the owner's workstation on 2026-11-17. "From Mobbin's guide" means the commands are Mobbin's own for that client and were not run here.

| Agent | Phase 1 | Phase 2 file | Status |
| --- | --- | --- | --- |
| Claude Code | `claude plugin marketplace add mobbin/skills`, then `claude plugin install mobbin@mobbin`. In a new session open `/mcp`, choose `plugin:mobbin:mobbin`, then Authenticate. | `claude mcp add --scope user --transport http mobbin https://<gateway-name>/mobbin/mcp --header "Authorization: Bearer <Gateway Secret>"` | Installed, sign-in pending. Confirmed. |
| Antigravity CLI | `agy plugin install https://github.com/mobbin/skills`. In `agy` open `/mcp`, choose `mobbin.mobbin`, then Authenticate and paste the code the callback page shows. | `~/.gemini/config/mcp_config.json`, key `mcpServers.mobbin` with `serverUrl` (not `url`) and a literal `headers.Authorization`; add beside the other servers, `chmod 600`. | Installed, sign-in pending. Confirmed. The Phase 2 shape is [infra's runbook, step 11](https://github.com/trajectonomics/infra/blob/main/docs/runbooks/deploy-mcp-auth-gateway.md). |
| Pi | `pi mcp add mobbin --url https://api.mobbin.com/mcp --exposure deferred --description "<one sentence>"`, then `pi mcp login mobbin` (see below). | `~/.pi/agent/mcp.json`, `mcpServers.mobbin` with `url` and `headers.Authorization`, the shape of the existing `posthog` entry. | Signed in, 8 tools. Confirmed. |
| OpenCode | In `~/.config/opencode/opencode.jsonc`, `mcp.mobbin = { "type": "remote", "url": "https://api.mobbin.com/mcp", "enabled": true }`, then `opencode mcp auth mobbin`. | The same entry with `headers.Authorization`, the shape of the existing `posthog` entry. | Entry added, sign-in pending. Confirmed. |
| Codex | `codex plugin marketplace add mobbin/skills`, `codex plugin add mobbin@mobbin`, then `codex mcp login mobbin`. | `[mcp_servers.mobbin]` in `~/.codex/config.toml`; check the key names against Codex's current documentation first. | Not installed on the workstation. From Mobbin's guide. |
| Gemini CLI | `gemini extensions install https://github.com/mobbin/skills`, then `/mcp auth mobbin` inside `gemini`. | `mcpServers.mobbin` in `~/.gemini/settings.json`; check the key names first. | Not installed on the workstation. From Mobbin's guide. |

### Signing Pi in without a browser on the host

`pi mcp login mobbin` prints an authorization link and listens on a loopback port on the host. In a terminal, open the link on any machine, approve, and paste the address the browser ends on when Pi asks. With no terminal attached, ask the owner for that address as a secret (the `request_secret` tool, `delivery: "file"`), `curl` it once at the listener on the same host, and delete the file. The address holds a one-time code, so it never goes in a chat message, a log or a commit.

## Check it

For each agent, in a new session:

1. List the MCP servers (`/mcp`, `pi mcp list`, `opencode mcp list`, `agy plugin list`). Mobbin reads as connected with eight tools. "Needs authentication" means the sign-in has not been done.
2. Run one search through the agent: `search_sections` for "comparison table". It returns named results with a Mobbin link and an `image_url`.

After the gateway is live, add its own checks from the runbook (`/health/token` is `valid`, and one `tools/list` through the gateway).

## Limits of a reading

- **Text only is not a design review.** A model without vision, such as the DeepSeek model Pi is limited to, sees Mobbin's text and links. It can search, and a vision model judges the images ([ADR 0023](./adr/0023-mobbin-is-where-a-surface-ticket-finds-its-visual-reference.md), decision 5).
- **Parallel agents share one limit.** The 60 a minute is per Mobbin user, not per agent.
- **Each sign-in is its own grant.** Revoking one agent in Mobbin does not sign out the others, and a plan lapse ends all of them.
