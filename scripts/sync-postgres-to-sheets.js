require('dotenv').config();

const { google } = require('googleapis');
const { Client } = require('pg');
const readline = require('readline/promises');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const DATABASE_URL = process.env.DATABASE_URL;

const SHEETS = {
    profiles: {
        name: 'Profiles',
        range: 'Profiles!A:K',
        headers: [
            'DISCORD_ID',
            'NAME',
            'AGE',
            'PRONOUNS',
            'HEIGHT',
            'LINK TO APPLICATION',
            'BALANCE',
            'LAST_DAILY',
            'HOUSE',
            'BIRTHDAY',
            'PICTURE',
        ],
    },
    shop: {
        name: 'Shop',
        range: 'Shop!A:C',
        headers: ['ITEM', 'PRICE', 'DESCRIPTION'],
    },
    inventory: {
        name: 'Inventory',
        range: 'Inventory!A:C',
        headers: ['OWNER', 'ITEM', 'QUANTITY'],
    },
    house: {
        name: 'House',
        range: 'House!A:B',
        headers: ['NAME', 'POINTS'],
    },
    tuppers: {
        name: 'Tuppers',
        range: 'Tuppers!A:C',
        headers: ['USERID', 'TUPPER', 'PC'],
    },
};

function requiredEnv(name) {
    if (!process.env[name]) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
}

function getAuth() {
    requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    requiredEnv('GOOGLE_PRIVATE_KEY');

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

function getSheets() {
    return google.sheets({ version: 'v4', auth: getAuth() });
}

function cell(value) {
    if (value === undefined || value === null) return '';
    return value;
}

async function loadRows(client) {
    const profiles = await client.query(`
        SELECT discord_id, character_name, age, pronouns, height, profile,
               balance, last_daily, house, birthday, picture
        FROM profiles
        ORDER BY character_name ASC
    `);
    const shopItems = await client.query(`
        SELECT name, price, description
        FROM shop_items
        ORDER BY name ASC
    `);
    const inventory = await client.query(`
        SELECT owner, item_name, quantity
        FROM inventory
        ORDER BY owner ASC, item_name ASC
    `);
    const houses = await client.query(`
        SELECT name, points
        FROM houses
        ORDER BY name ASC
    `);
    const tuppers = await client.query(`
        SELECT user_id, tupper_name, player_character
        FROM tuppers
        ORDER BY user_id ASC, tupper_name ASC
    `);

    return {
        profiles: profiles.rows.map(row => [
            cell(row.discord_id),
            cell(row.character_name),
            cell(row.age),
            cell(row.pronouns),
            cell(row.height),
            cell(row.profile),
            cell(row.balance),
            cell(row.last_daily),
            cell(row.house),
            cell(row.birthday),
            cell(row.picture),
        ]),
        shop: shopItems.rows.map(row => [
            cell(row.name),
            cell(row.price),
            cell(row.description),
        ]),
        inventory: inventory.rows.map(row => [
            cell(row.owner),
            cell(row.item_name),
            cell(row.quantity),
        ]),
        house: houses.rows.map(row => [
            cell(row.name),
            cell(row.points),
        ]),
        tuppers: tuppers.rows.map(row => [
            cell(row.user_id),
            cell(row.tupper_name),
            cell(row.player_character),
        ]),
    };
}

async function replaceSheetRows(sheets, config, rows) {
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: config.range,
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.name}!A1`,
        valueInputOption: 'RAW',
        resource: {
            values: [config.headers, ...rows],
        },
    });
}

async function confirmWrite() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const answer = await rl.question('Replace Google Sheets with this Postgres data? Type yes to continue: ');
        return answer.trim().toLowerCase() === 'yes';
    } finally {
        rl.close();
    }
}

async function main() {
    requiredEnv('SPREADSHEET_ID');
    requiredEnv('DATABASE_URL');

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        console.log('Reading Postgres data...');
        const rowsBySheet = await loadRows(client);

        console.log('Rows ready to sync:');
        for (const [key, rows] of Object.entries(rowsBySheet)) {
            console.log(`- ${SHEETS[key].name}: ${rows.length} rows`);
        }

        const shouldWrite = await confirmWrite();
        if (!shouldWrite) {
            console.log('Cancelled. No Google Sheets data was changed.');
            return;
        }

        console.log('Writing Google Sheets data...');
        const sheets = getSheets();
        for (const [key, config] of Object.entries(SHEETS)) {
            await replaceSheetRows(sheets, config, rowsBySheet[key]);
        }

        console.log('Sync complete:');
        for (const [key, rows] of Object.entries(rowsBySheet)) {
            console.log(`- ${SHEETS[key].name}: ${rows.length} rows`);
        }
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
