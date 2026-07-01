// In-memory cache for shop items, per-user inventories, and profiles.
// Populated on first use; cleared when data mutates.
// Resets to empty on bot restart — cold-cache autocomplete falls back to Sheets.

const PROFILES_TTL = 5 * 60 * 1000; // 5 minutes

const shopCache = { data: null };
const inventoryCache = new Map(); // userId → [{ itemName, quantity }]
const profilesCache = { data: null, ts: 0 };

function getShopCache() { return shopCache.data; }
function setShopCache(items) { shopCache.data = items; }

function getInventoryCache(userId) { return inventoryCache.get(userId) ?? null; }
function setInventoryCache(userId, items) { inventoryCache.set(userId, items); }
function clearInventoryCache(userId) { inventoryCache.delete(userId); }
function clearAllInventoryCache() { inventoryCache.clear(); }

function getProfilesCache() {
    if (Date.now() - profilesCache.ts > PROFILES_TTL) return null;
    return profilesCache.data;
}
function setProfilesCache(profiles) { profilesCache.data = profiles; profilesCache.ts = Date.now(); }

module.exports = { getShopCache, setShopCache, getInventoryCache, setInventoryCache, clearInventoryCache, clearAllInventoryCache, getProfilesCache, setProfilesCache };
