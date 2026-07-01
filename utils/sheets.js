// Google Sheets helper — all database reads and writes go through here.
// Three sheets: Profiles (wallets + character data), Shop (item catalog), Inventory (per-user items).

require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// ── Column configuration ──────────────────────────────────────────────────────
// Change BALANCE_COL if the balance column moves in the Profiles sheet.
// Must match the letter in GSHEET.md.
const BALANCE_COL    = 'G';
const LAST_DAILY_COL = 'H';
const DISCORD_ID_COL = 'A';

// 0-based column indices for reading rows returned by the Sheets API
const COL = {
    DISCORD_ID: 0, // A
    NAME:       1, // B
    AGE:        2, // C
    PRONOUNS:   3, // D
    HEIGHT:     4, // E
    PROFILE:    5, // F
    BALANCE:    6, // G
    LAST_DAILY: 7, // H
};

// ── Auth ──────────────────────────────────────────────────────────────────────

// GoogleAuth with service account credentials from .env
function getAuth() {
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            // Private key is stored as a single line in .env; newlines must be restored
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

function getSheets() {
    return google.sheets({ version: 'v4', auth: getAuth() });
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

async function readRange(range) {
    const res = await getSheets().spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
    });
    return res.data.values || [];
}

async function writeCell(range, value) {
    await getSheets().spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        resource: { values: [[value]] },
    });
}

async function appendRow(sheet, rowData) {
    await getSheets().spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A:A`,
        valueInputOption: 'RAW',
        resource: { values: [rowData] },
    });
}

// Deletes a single row by its 1-based sheet row index
async function deleteRow(sheetId, rowIndex) {
    await getSheets().spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1, // API uses 0-based index
                        endIndex: rowIndex,
                    },
                },
            }],
        },
    });
}

// Looks up a sheet's numeric ID (needed for row deletion)
async function getSheetId(sheetName) {
    const res = await getSheets().spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = res.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    return sheet.properties.sheetId;
}

// ── Profiles ──────────────────────────────────────────────────────────────────
// Columns: A=NAME, B=AGE, C=PRONOUNS, D=HEIGHT, E=APPLICATION, F=BALANCE, G=LAST_DAILY, H=DISCORD_ID
// Profiles are created manually in the sheet. The bot only writes to F, G, H.

// Finds a profile row by Discord UserID (column H).
// Throws if no profile exists — profiles must be set up manually by an admin.
async function getUser(userId) {
    const rows = await readRange('Profiles!A:H');
    for (let i = 1; i < rows.length; i++) { // skip header row
        if (rows[i][COL.DISCORD_ID] === userId) {
            return {
                rowIndex: i + 1, // 1-based for Sheets API write calls
                characterName: rows[i][COL.NAME] || '',
                age:           rows[i][COL.AGE] || '',
                pronouns:      rows[i][COL.PRONOUNS] || '',
                height:        rows[i][COL.HEIGHT] || '',
                profile:       rows[i][COL.PROFILE] || '',
                balance:       parseInt(rows[i][COL.BALANCE] || '0', 10),
                lastDaily:     rows[i][COL.LAST_DAILY] || null,
            };
        }
    }
    throw new Error("You don't have a profile set up. Contact an admin.");
}

async function setBalance(rowIndex, amount) {
    await writeCell(`Profiles!${BALANCE_COL}${rowIndex}`, amount);
}

async function setLastDaily(rowIndex, timestamp) {
    await writeCell(`Profiles!${LAST_DAILY_COL}${rowIndex}`, timestamp);
}

// Adds coins to a user and returns their new balance
async function addBalance(userId, amount) {
    const { rowIndex, balance } = await getUser(userId);
    const newBalance = balance + amount;
    await setBalance(rowIndex, newBalance);
    return newBalance;
}

// Deducts coins from a user and returns their new balance.
// Throws if the user doesn't have enough funds.
async function deductBalance(userId, amount) {
    const { rowIndex, balance } = await getUser(userId);
    if (balance < amount) throw new Error(`Insufficient funds. Balance: ${balance}`);
    const newBalance = balance - amount;
    await setBalance(rowIndex, newBalance);
    return newBalance;
}

// ── Shop ──────────────────────────────────────────────────────────────────────
// Columns: A=ITEM, B=PRICE, C = description

async function getShopItems() {
    const rows = await readRange('Shop!A:C');
    return rows.slice(1).map(r => ({ name: r[0], price: parseInt(r[1] || '0', 10), itemdesc: r[2] }));
}

// ── Inventory ─────────────────────────────────────────────────────────────────
// Columns: A=OWNER (character name), B=ITEM, C=QUANTITY
// One row per character per item type. OWNER matches NAME in Profiles.

async function getInventory(characterName) {
    const rows = await readRange('Inventory!A:C');
    const result = [];
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0]?.toLowerCase() === characterName.toLowerCase()) {
            result.push({
                rowIndex: i + 1,
                itemName: rows[i][1],
                quantity: parseInt(rows[i][2] || '0', 10),
            });
        }
    }
    return result;
}

// Returns a single item entry for a character, or null if they don't own it
async function getInventoryItem(characterName, itemName) {
    const rows = await readRange('Inventory!A:C');
    for (let i = 1; i < rows.length; i++) {
        if (
            rows[i][0]?.toLowerCase() === characterName.toLowerCase() &&
            rows[i][1]?.toLowerCase() === itemName.toLowerCase()
        ) {
            return { rowIndex: i + 1, quantity: parseInt(rows[i][2] || '0', 10) };
        }
    }
    return null;
}

// Adds quantity to an existing inventory row, or creates a new row if needed
async function addInventoryItem(characterName, itemName, quantity) {
    const existing = await getInventoryItem(characterName, itemName);
    if (existing) {
        await writeCell(`Inventory!C${existing.rowIndex}`, existing.quantity + quantity);
    } else {
        await appendRow('Inventory', [characterName, itemName, quantity]);
    }
}

// Removes quantity from an inventory row; deletes the row entirely if it hits 0.
// Throws if the character doesn't own the item or has insufficient quantity.
async function removeInventoryItem(characterName, itemName, quantity) {
    const existing = await getInventoryItem(characterName, itemName);
    if (!existing) throw new Error(`You don't have any **${itemName}**.`);
    if (existing.quantity < quantity) throw new Error(`Insufficient quantity. You have ${existing.quantity}x **${itemName}**.`);
    await writeCell(`Inventory!C${existing.rowIndex}`, existing.quantity - quantity);
}

// Returns all profiles as { discordId, characterName } pairs (for autocomplete)
async function getAllProfiles() {
    const rows = await readRange('Profiles!A:H');
    return rows.slice(1)
        .filter(r => r[COL.DISCORD_ID] && r[COL.NAME])
        .map(r => ({ discordId: r[COL.DISCORD_ID], characterName: r[COL.NAME] }));
}

module.exports = {
    getUser,
    getAllProfiles,
    setLastDaily,
    addBalance,
    deductBalance,
    getShopItems,
    getInventory,
    addInventoryItem,
    removeInventoryItem,
};
