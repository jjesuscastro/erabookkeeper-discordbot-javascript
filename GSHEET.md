# GSheet Format

## Profiles
| A | B | C | D | E | F | G | H | I | J | K |
|-|-|-|-|-|-|-|-|-|-|-|
| DISCORD_ID | NAME | AGE | PRONOUNS | HEIGHT | LINK TO APPLICATION | BALANCE | LAST_DAILY | HOUSE | BIRTHDAY | PICTURE 
| *auto* | *data* | *data* | *data* | *data* | *data* | *auto* | *auto* | *data* | *data* | *data* |

> Columns A, G, H are managed by the bot. Fill in B–F manually per character.
> BALANCE column letter is configurable in `utils/sheets.js` (`BALANCE_COL`).

## Inventory
| A | B | C |
|-|-|-|
| OWNER | ITEM | QUANTITY |
| *data* | *data* | *data* |

> OWNER matches the NAME field in Profiles.

## Shop
| A | B | C |
|-|-|-|
| ITEM | PRICE | DESCRIPTION |
| *data* | *data* | *data* | 
