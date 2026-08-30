require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
}

async function main() {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    await client.connect();
    try {
        await client.query(schema);
        console.log('PostgreSQL schema applied.');
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
