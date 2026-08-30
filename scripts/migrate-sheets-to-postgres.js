require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Client } = require('pg');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const DATABASE_URL = process.env.DATABASE_URL;

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
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}

function getSheets() {
    return google.sheets({ version: 'v4', auth: getAuth() });
}

async function readRange(range) {
    const res = await getSheets().spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
    });

    return res.data.values || [];
}

function text(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
}

function intValue(value) {
    const parsed = parseInt(value || '0', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

async function applySchema(client) {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
}

async function migrateProfiles(client, rows) {
    let count = 0;

    for (const row of rows.slice(1)) {
        const discordId = text(row[0]);
        const characterName = text(row[1]);
        if (!discordId || !characterName) continue;

        await client.query(
            `
            INSERT INTO profiles (
                discord_id, character_name, age, pronouns, height, profile,
                balance, last_daily, house, birthday, picture
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (discord_id) DO UPDATE SET
                character_name = EXCLUDED.character_name,
                age = EXCLUDED.age,
                pronouns = EXCLUDED.pronouns,
                height = EXCLUDED.height,
                profile = EXCLUDED.profile,
                balance = EXCLUDED.balance,
                last_daily = EXCLUDED.last_daily,
                house = EXCLUDED.house,
                birthday = EXCLUDED.birthday,
                picture = EXCLUDED.picture
            `,
            [
                discordId,
                characterName,
                text(row[2]),
                text(row[3]),
                text(row[4]),
                text(row[5]),
                intValue(row[6]),
                text(row[7]),
                text(row[8]),
                text(row[9]),
                text(row[10]),
            ],
        );
        count += 1;
    }

    return count;
}

async function migrateShopItems(client, rows) {
    let count = 0;

    for (const row of rows.slice(1)) {
        const name = text(row[0]);
        if (!name) continue;

        await client.query(
            `
            INSERT INTO shop_items (name, price, description)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO UPDATE SET
                price = EXCLUDED.price,
                description = EXCLUDED.description
            `,
            [name, intValue(row[1]), text(row[2])],
        );
        count += 1;
    }

    return count;
}

async function migrateInventory(client, rows) {
    let count = 0;

    for (const row of rows.slice(1)) {
        const owner = text(row[0]);
        const itemName = text(row[1]);
        if (!owner || !itemName) continue;

        await client.query(
            `
            INSERT INTO inventory (owner, item_name, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (owner, item_name) DO UPDATE SET
                quantity = EXCLUDED.quantity
            `,
            [owner, itemName, intValue(row[2])],
        );
        count += 1;
    }

    return count;
}

async function migrateHouses(client, rows) {
    let count = 0;

    for (const row of rows.slice(1)) {
        const name = text(row[0]);
        if (!name) continue;

        await client.query(
            `
            INSERT INTO houses (name, points)
            VALUES ($1, $2)
            ON CONFLICT (name) DO UPDATE SET
                points = EXCLUDED.points
            `,
            [name, intValue(row[1])],
        );
        count += 1;
    }

    return count;
}

async function migrateTuppers(client, rows) {
    let count = 0;

    for (const row of rows.slice(1)) {
        const userId = text(row[0]);
        const tupperName = text(row[1]);
        if (!userId || !tupperName) continue;

        await client.query(
            `
            INSERT INTO tuppers (user_id, tupper_name, player_character)
            VALUES ($1, $2, $3)
            ON CONFLICT (tupper_name) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                player_character = EXCLUDED.player_character
            `,
            [userId, tupperName, text(row[2])],
        );
        count += 1;
    }

    return count;
}

async function main() {
    requiredEnv('SPREADSHEET_ID');
    requiredEnv('DATABASE_URL');

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        console.log('Applying database schema...');
        await applySchema(client);

        console.log('Reading Google Sheets data...');
        const [profiles, shopItems, inventory, houses, tuppers] = await Promise.all([
            readRange('Profiles!A:K'),
            readRange('Shop!A:C'),
            readRange('Inventory!A:C'),
            readRange('House!A:B'),
            readRange('Tuppers!A:C'),
        ]);

        await client.query('BEGIN');
        const counts = {
            profiles: await migrateProfiles(client, profiles),
            shop_items: await migrateShopItems(client, shopItems),
            inventory: await migrateInventory(client, inventory),
            houses: await migrateHouses(client, houses),
            tuppers: await migrateTuppers(client, tuppers),
        };
        await client.query('COMMIT');

        console.log('Migration complete:');
        for (const [table, count] of Object.entries(counts)) {
            console.log(`- ${table}: ${count} rows imported or updated`);
        }
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
