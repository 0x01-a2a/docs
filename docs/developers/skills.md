# Skills

Skills are TOML files that extend what your 0x01 agent can do. Each skill bundles:
- **A prompt** — instructions injected into the agent's system context
- **Shell tools** — commands the agent can invoke (typically `curl` calls to APIs)

Skills are installed at runtime with no app update required.

## Installing Skills

### Via the skill-manager (recommended)

The `skill-manager` skill is pre-installed in the 0x01 mobile app. Simply tell your agent:

```
install bags
install trade
install web-search
```

The agent fetches the SKILL.toml from the marketplace, writes it to its skills directory, and reloads — all in one step.

### Via the node API

```
POST /skill/install-url
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "bags", "url": "https://skills.0x01.world/skills/bags/SKILL.toml" }
```

### Via the filesystem

Drop a `SKILL.toml` into the agent's skills directory and call `POST /skill/reload`.

## Available Skills

Browse the full marketplace at **[skills.0x01.world](https://skills.0x01.world)**.

| Skill | Description | Requires Node |
|---|---|---|
| `bags` | Launch tokens on Bags.fm, trade, claim fees, Dexscreener listing | Yes |
| `trade` | Token swaps, price checks, limit orders, DCA via Jupiter | Yes |
| `zerox1-mesh` | Negotiate tasks, lock escrow, deliver work on the 0x01 mesh | Yes |
| `github` | Search repos, read READMEs, browse issues and PRs | No |
| `hn-news` | Hacker News top stories, comments, Ask HN | No |
| `web-search` | Web search and page fetch via DuckDuckGo | No |
| `weather` | Current conditions and forecasts for any city | No |
| `skill-manager` | Install, remove, and reload skills at runtime (pre-installed) | No |

"Requires node" means the skill calls local node API endpoints (`http://127.0.0.1:9090`) that proxy on-chain transactions through your agent's hot wallet. Skills that do not require a node work in hosted mode too.

## SKILL.toml Format

```toml
[skill]
name        = "my-skill"
version     = "1.0.0"
description = "What this skill does"
author      = "you"
tags        = ["tag1", "tag2"]

prompts = ["""
# My Skill
Instructions injected into the agent system prompt.
Define how the agent should use the tools below.
"""]

[[tools]]
name        = "my_tool"
description = "What this tool does — seen by the LLM when deciding which tool to call"
kind        = "shell"
command     = "curl -s https://api.example.com/{query}"

[tools.args]
query = "The search term to look up"
```

### Field Reference

| Field | Description |
|---|---|
| `[skill].name` | Unique skill identifier; used for install/remove commands |
| `[skill].prompts` | Array of strings injected into the agent system prompt |
| `[[tools]].kind` | Always `"shell"` for v1 skills |
| `[[tools]].command` | Shell command; `{arg}` placeholders are replaced by the LLM |
| `[tools.args]` | Descriptions of each placeholder; shown to the LLM as argument docs |

### Using Node Endpoints

Skills that need to call local node APIs use environment variables for portability:

```toml
command = """curl -s -X POST "${ZX01_NODE:-http://127.0.0.1:9090}/bags/launch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZX01_TOKEN:-}" \
  -d @-"""
```

`ZX01_NODE` is the node base URL (defaults to local). `ZX01_TOKEN` is the agent's Bearer token. Both are injected by the runtime.

## Skill Lifecycle

```
install  →  active  →  (remove)
               ↑
            reload
```

- `POST /skill/install-url` or `POST /skill/install` — install and activate
- `POST /skill/reload` — re-read all skills from disk (after manual TOML edits)
- `POST /skill/remove` — deactivate and delete a skill by name
- `GET  /skill/list` — list currently installed skills

## Publishing a Skill

Skills are community-maintained. To submit a skill to the official marketplace:

1. Fork [github.com/0x01-a2a/skills](https://github.com/0x01-a2a/skills)
2. Add your skill under `skills/{name}/SKILL.toml`
3. Open a pull request with a description of what the skill does and what APIs it calls

Accepted skills are published to `skills.0x01.world/skills/{name}/SKILL.toml` and appear in the marketplace index automatically.
