# Book Keeper — Commands

## Money

| Command | Who | Description |
|---|---|---|
| `/balance [@user]` | Anyone | Shows your or another user's coin balance |
| `/daily` | Anyone | Claims 100 coins — 24h cooldown |
| `/transfermoney @user <amount>` | Anyone | Sends coins to another user, deducted from your balance |
| `/takemoney @user <amount>` | Admin | Removes coins from a user and destroys them |
| `/givemoney @user <amount>` | Admin | Adds coins to a user |
| `/housepoints <house>` | Anyone | Checks house points |

## Shop

| Command | Who | Description |
|---|---|---|
| `/shop` | Anyone | Lists all items and their prices |
| `/buy <item> <quantity>` | Anyone | Purchases an item, deducted from your balance |
| `/use <item> <quantity>` | Anyone | Consumes items from your inventory |
| `/inventory` | Anyone | Shows your own inventory |
| `/transferitem @user <item> <quantity>` | Anyone | Gives items from your inventory to another user |

---

> Shop items are managed directly in the `Shop` sheet — add a row with the item name and price and it immediately appears in `/shop`.
