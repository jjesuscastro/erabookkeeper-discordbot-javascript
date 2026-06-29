// In-memory cache for shop items and per-user inventories.
// Populated when a user runs /shop or /inventory so autocomplete has data ready.
// Cleared when inventory-mutating commands succeed (buy, use, transferitem).
// Resets to empty on bot restart — cold-cache autocomplete falls back to Sheets.

const shopCache = { data: null };
const inventoryCache = new Map(); // userId → [{ itemName, quantity }]

function getShopCache() { return shopCache.data; }
function setShopCache(items) { shopCache.data = items; }

function getInventoryCache(userId) { return inventoryCache.get(userId) ?? null; }
function setInventoryCache(userId, items) { inventoryCache.set(userId, items); }
function clearInventoryCache(userId) { inventoryCache.delete(userId); }

module.exports = { getShopCache, setShopCache, getInventoryCache, setInventoryCache, clearInventoryCache };
