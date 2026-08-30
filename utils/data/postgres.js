require('dotenv').config();

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when DATA_BACKEND=postgres.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function withClient(fn) {
    const client = await pool.connect();
    try {
        return await fn(client);
    } finally {
        client.release();
    }
}

async function withTransaction(fn) {
    return withClient(async client => {
        await client.query('BEGIN');
        try {
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
    });
}

function mapUser(row) {
    return {
        rowIndex: row.discord_id,
        characterName: row.character_name || '',
        age: row.age || '',
        pronouns: row.pronouns || '',
        height: row.height || '',
        profile: row.profile || '',
        balance: parseInt(row.balance || '0', 10),
        lastDaily: row.last_daily || null,
        house: row.house || null,
        birthday: row.birthday || null,
        picture: row.picture || null,
    };
}

async function getUser(userId) {
    const res = await pool.query(
        `
        SELECT discord_id, character_name, age, pronouns, height, profile,
               balance, last_daily, house, birthday, picture
        FROM profiles
        WHERE discord_id = $1
        `,
        [String(userId)],
    );

    if (!res.rows[0]) {
        throw new Error("You don't have a profile set up. Contact an admin.");
    }

    return mapUser(res.rows[0]);
}

async function getAllBalances() {
    const res = await pool.query(
        `
        SELECT discord_id, character_name, balance
        FROM profiles
        ORDER BY character_name ASC
        `,
    );

    return res.rows.map(row => ({
        mun: row.discord_id,
        character: row.character_name,
        balance: parseInt(row.balance || '0', 10),
    }));
}

async function getUserID(name) {
    const res = await pool.query(
        'SELECT discord_id FROM profiles WHERE character_name = $1',
        [name],
    );
    return res.rows[0] ? parseInt(res.rows[0].discord_id, 10) : null;
}

async function setLastDaily(rowIndex, timestamp) {
    await pool.query(
        'UPDATE profiles SET last_daily = $2 WHERE discord_id = $1',
        [String(rowIndex), timestamp],
    );
}

async function addBalance(userId, amount) {
    return withTransaction(async client => {
        const res = await client.query(
            `
            UPDATE profiles
            SET balance = balance + $2
            WHERE discord_id = $1
            RETURNING balance
            `,
            [String(userId), amount],
        );

        if (!res.rows[0]) {
            throw new Error("You don't have a profile set up. Contact an admin.");
        }

        return parseInt(res.rows[0].balance || '0', 10);
    });
}

async function deductBalance(userId, amount) {
    return withTransaction(async client => {
        const profile = await client.query(
            'SELECT balance FROM profiles WHERE discord_id = $1 FOR UPDATE',
            [String(userId)],
        );

        if (!profile.rows[0]) {
            throw new Error("You don't have a profile set up. Contact an admin.");
        }

        const balance = parseInt(profile.rows[0].balance || '0', 10);
        if (balance < amount) throw new Error('Insufficient funds.');

        const newBalance = balance - amount;
        await client.query(
            'UPDATE profiles SET balance = $2 WHERE discord_id = $1',
            [String(userId), newBalance],
        );
        return newBalance;
    });
}

async function getStandings() {
    const res = await pool.query(
        'SELECT name, points FROM houses ORDER BY points DESC, name ASC',
    );

    return res.rows.map(row => ({
        house: row.name,
        points: parseInt(row.points || '0', 10),
    }));
}

async function getHousePoints(houseID) {
    const res = await pool.query(
        'SELECT points FROM houses WHERE lower(name) = lower($1)',
        [houseID],
    );

    if (!res.rows[0]) throw new Error('House not found.');
    return res.rows[0].points || 0;
}

async function addPoints(houseID, amount) {
    return updateHousePoints(houseID, amount);
}

async function deductPoints(houseID, amount) {
    return updateHousePoints(houseID, -amount);
}

async function updateHousePoints(houseID, amount) {
    return withTransaction(async client => {
        const house = await client.query(
            'SELECT name, points FROM houses WHERE lower(name) = lower($1) FOR UPDATE',
            [houseID],
        );

        if (!house.rows[0]) throw new Error('House not found.');

        const newBalance = parseInt(house.rows[0].points || '0', 10) + amount;
        await client.query(
            'UPDATE houses SET points = $2 WHERE name = $1',
            [house.rows[0].name, newBalance],
        );

        return newBalance;
    });
}

async function getTupper(name) {
    const res = await pool.query(
        `
        SELECT user_id, tupper_name, player_character
        FROM tuppers
        WHERE tupper_name = $1
        `,
        [name],
    );

    if (!res.rows[0]) {
        return {
            tupperuser: '',
            tupperName: '',
            playerChara: '',
        };
    }

    return {
        rowIndex: res.rows[0].tupper_name,
        tupperuser: res.rows[0].user_id || '',
        tupperName: res.rows[0].tupper_name || '',
        playerChara: res.rows[0].player_character || '',
    };
}

async function addTupper(user, tupperName, playerChara) {
    return withTransaction(async client => {
        const existing = await client.query(
            'SELECT tupper_name FROM tuppers WHERE tupper_name = $1',
            [tupperName],
        );

        if (existing.rows[0]) {
            throw new Error('Already added.');
        }

        await client.query(
            `
            INSERT INTO tuppers (user_id, tupper_name, player_character)
            VALUES ($1, $2, $3)
            `,
            [String(user), tupperName, playerChara],
        );
    });
}

async function deleteTupper(tupperName) {
    const res = await pool.query(
        'DELETE FROM tuppers WHERE tupper_name = $1',
        [tupperName],
    );

    if (res.rowCount === 0) {
        throw new Error('Tupper not found.');
    }
}

async function getTupperList(user) {
    const res = await pool.query(
        `
        SELECT user_id, tupper_name, player_character
        FROM tuppers
        WHERE user_id = $1
        ORDER BY tupper_name ASC
        `,
        [String(user)],
    );

    return res.rows.map(row => ({
        tupperuser: row.user_id || '',
        tupperName: row.tupper_name || '',
        playerChara: row.player_character || '',
    }));
}

async function getShopItems() {
    const res = await pool.query(
        'SELECT name, price, description FROM shop_items ORDER BY name ASC',
    );

    return res.rows.map(row => ({
        name: row.name,
        price: parseInt(row.price || '0', 10),
        itemdesc: row.description,
    }));
}

async function getInventory(characterName) {
    const res = await pool.query(
        `
        SELECT owner, item_name, quantity
        FROM inventory
        WHERE lower(owner) = lower($1)
        ORDER BY item_name ASC
        `,
        [characterName],
    );

    return res.rows.map(row => ({
        rowIndex: `${row.owner}:${row.item_name}`,
        itemName: row.item_name,
        quantity: parseInt(row.quantity || '0', 10),
    }));
}

async function getInventoryItem(client, characterName, itemName, lock = false) {
    const res = await client.query(
        `
        SELECT owner, item_name, quantity
        FROM inventory
        WHERE lower(owner) = lower($1)
          AND lower(item_name) = lower($2)
        ${lock ? 'FOR UPDATE' : ''}
        `,
        [characterName, itemName],
    );

    return res.rows[0] || null;
}

async function addInventoryItem(characterName, itemName, quantity) {
    return withTransaction(async client => {
        const existing = await getInventoryItem(client, characterName, itemName, true);

        if (existing) {
            await client.query(
                `
                UPDATE inventory
                SET quantity = quantity + $3
                WHERE owner = $1 AND item_name = $2
                `,
                [existing.owner, existing.item_name, quantity],
            );
        } else {
            await client.query(
                `
                INSERT INTO inventory (owner, item_name, quantity)
                VALUES ($1, $2, $3)
                `,
                [characterName, itemName, quantity],
            );
        }
    });
}

async function removeInventoryItem(characterName, itemName, quantity) {
    return withTransaction(async client => {
        const existing = await getInventoryItem(client, characterName, itemName, true);
        if (!existing) throw new Error('Item does not exist.');

        const existingQuantity = parseInt(existing.quantity || '0', 10);
        if (existingQuantity < quantity) throw new Error('Insufficient quantity.');

        const newQuantity = existingQuantity - quantity;
        if (newQuantity <= 0) {
            await client.query(
                'DELETE FROM inventory WHERE owner = $1 AND item_name = $2',
                [existing.owner, existing.item_name],
            );
        } else {
            await client.query(
                `
                UPDATE inventory
                SET quantity = $3
                WHERE owner = $1 AND item_name = $2
                `,
                [existing.owner, existing.item_name, newQuantity],
            );
        }
    });
}

async function getAllProfiles() {
    const res = await pool.query(
        `
        SELECT discord_id, character_name
        FROM profiles
        WHERE discord_id IS NOT NULL
          AND character_name IS NOT NULL
        ORDER BY character_name ASC
        `,
    );

    return res.rows.map(row => ({
        discordId: row.discord_id,
        characterName: row.character_name,
    }));
}

module.exports = {
    getUser,
    getUserID,
    getAllProfiles,
    setLastDaily,
    addBalance,
    deductBalance,
    getAllBalances,
    getStandings,
    getHousePoints,
    addPoints,
    deductPoints,
    getTupper,
    addTupper,
    getTupperList,
    deleteTupper,
    getShopItems,
    getInventory,
    addInventoryItem,
    removeInventoryItem,
};
