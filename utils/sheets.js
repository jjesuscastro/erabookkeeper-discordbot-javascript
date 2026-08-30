require('dotenv').config();

const backendName = (process.env.DATA_BACKEND || 'postgres').toLowerCase();

if (backendName === 'sheets' || backendName === 'google-sheets' || backendName === 'google') {
    module.exports = require('./data/sheets');
} else if (backendName === 'postgres' || backendName === 'postgresql' || backendName === 'pg') {
    module.exports = require('./data/postgres');
} else {
    throw new Error(`Unsupported DATA_BACKEND "${process.env.DATA_BACKEND}". Use "postgres" or "sheets".`);
}
