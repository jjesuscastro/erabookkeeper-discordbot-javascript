const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to persist forwarded message IDs.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let tableReady;

async function ensureTable() {
    if (!tableReady) {
        tableReady = pool.query(`
            CREATE TABLE IF NOT EXISTS forwarded_messages (
                message_id TEXT PRIMARY KEY,
                forwarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `).catch(error => {
            tableReady = null;
            throw error;
        });
    }
    await tableReady;
}

async function claimForwardedMessage(messageId) {
    await ensureTable();
    const result = await pool.query(
        'INSERT INTO forwarded_messages (message_id) VALUES ($1) ON CONFLICT (message_id) DO NOTHING RETURNING message_id',
        [messageId],
    );
    return result.rowCount === 1;
}

async function releaseForwardedMessage(messageId) {
    await pool.query('DELETE FROM forwarded_messages WHERE message_id = $1', [messageId]);
}

module.exports = { claimForwardedMessage, releaseForwardedMessage };
