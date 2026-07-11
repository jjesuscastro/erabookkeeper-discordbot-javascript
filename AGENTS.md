# Book Keeper — Agent Guide

**Discord.js v14 bot** (CommonJS) for a coin economy + item shop backed by **Google Sheets**. Single-package, no monorepo.

## Quick start

```bash
npm install
node deploy-commands.js   # required after adding/renaming/removing any slash command
node index.js
```

Docker: `docker compose up --build` (runs `deploy-commands.js && node index.js` on start automatically).

## Commands

Loaded from `commands/<folder>/<file>.js`. Currently all live under `commands/economy/`.

`deploy-commands.js` registers commands **globally** (`Routes.applicationCommands`). The comment mentioning guild-scoped is stale — the actual call is global. Global registration takes ~1h to propagate; for faster dev, swap to guild-scoped.

## Google Sheets

Three sheets in one spreadsheet (configured via `SPREADSHEET_ID`):

| Sheet | Key detail |
|---|---|
| `Profiles` | Rows created *manually* — bot only writes balance (col G) and last_daily (col H). Bot throws if no profile exists for a user. |
| `Shop` | Item catalog — add a row and `/shop` picks it up immediately. |
| `Inventory` | Per-character items. OWNER matches the `NAME` field in Profiles. |
| `House` | House points. Rows do not change. Amount is changed via bot. |

`BALANCE_COL` constant in `utils/sheets.js:12` — update if the balance column moves.

## Caching (`utils/cache.js`)

| Cache | Lifetime |
|---|---|
| Shop | Permanent until mutation (`/buy`, `/reload`). |
| Inventory | Per-user, cleared on mutation. |
| Profiles | 5-minute TTL. |

All caches reset on bot restart. Autocomplete falls back to Sheets when cache is cold. `/reload` (admin only) refreshes everything from Sheets.

## Quirks & gotchas

- **`COOLDOWN_MS = 0`** in `daily.js:6` — daily claim cooldown is **disabled**. The actual 24h value is commented out.
- **Private key newlines**: `GOOGLE_PRIVATE_KEY` stored as a single line with literal `\n` in `.env`; restored via `.replace(/\\n/g, '\n')` in `sheets.js:36`.
- **No test suite**. `npm test` is a placeholder `echo`. No lint, no typecheck, no formatter config.
- **Intents**: Only `Guilds` + `GuildMessages` (`index.js:9`).
- **Security**: `.env` with live credentials is **committed to git** (present in this checkout). Do not replicate. `.gitignore` lists `.env` — ensure the file stays out of future commits.
- **Command pattern**: Each file exports `{ data, execute, autocomplete? }`. `data` is a `SlashCommandBuilder` instance. `execute` receives the interaction.
