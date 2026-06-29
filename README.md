# Book Keeper

A Discord bot for managing a coin economy and item shop, backed by Google Sheets.

## Features

- Coin balances with daily claims and transfers
- Item shop with inventory management
- All data stored in a Google Spreadsheet — no database required
- Admin commands for manual economy management

## Commands

### Money

| Command | Who | Description |
|---|---|---|
| `/balance [@user]` | Anyone | Shows your or another user's coin balance |
| `/daily` | Anyone | Claims 100 coins — 24h cooldown |
| `/transfermoney @user <amount>` | Anyone | Sends coins to another user |
| `/givemoney @user <amount>` | Admin | Adds coins to a user |
| `/takemoney @user <amount>` | Admin | Removes coins from a user |

### Shop

| Command | Who | Description |
|---|---|---|
| `/shop` | Anyone | Lists all items and their prices |
| `/buy <item> <quantity>` | Anyone | Purchases an item |
| `/use <item> <quantity>` | Anyone | Consumes items from your inventory |
| `/inventory` | Anyone | Shows your inventory |
| `/transferitem @user <item> <quantity>` | Anyone | Gives items to another user |

> Shop items are managed directly in the `Shop` sheet — add a row and it immediately appears in `/shop`.

## Google Sheets Setup

The bot reads from and writes to three sheets in one spreadsheet. See [GSHEET.md](GSHEET.md) for the exact column layout.

| Sheet | Purpose |
|---|---|
| `Profiles` | One row per user — stores Discord ID, character info, balance, and daily cooldown |
| `Inventory` | One row per owned item — owner name, item name, quantity |
| `Shop` | Item catalog — item name and price |

## Deployment

### Prerequisites

- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Google Cloud service account with the Sheets API enabled and editor access to the spreadsheet

### Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```
BOT_TOKEN=                   # Discord bot token
CLIENT_ID=                   # Discord application ID
SPREADSHEET_ID=              # Google Sheets spreadsheet ID
GOOGLE_SERVICE_ACCOUNT_EMAIL= # Service account email
GOOGLE_PRIVATE_KEY=          # Service account private key (include the full key with newlines)
```

### Docker / Portainer

The repo includes a `Dockerfile` and `docker-compose.yml`. On startup the container registers slash commands with Discord, then runs the bot.

**Portainer (recommended):**

1. Push this repo to GitHub/GitLab (`.env` is gitignored — never commit it)
2. In Portainer: **Stacks → Add stack → Repository**
3. Point to your repo and set compose path to `docker-compose.yml`
4. Add all six environment variables in the Portainer UI
5. Deploy

**Local:**

```bash
docker compose up --build
```

### Running Without Docker

```bash
npm install
node deploy-commands.js   # register slash commands once
node index.js
```
