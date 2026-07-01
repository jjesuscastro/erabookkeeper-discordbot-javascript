// Resolves a user string option (character name or Discord mention) to { discordId, characterName }.
// Autocomplete suggestions come from the profiles cache so repeated typing stays fast.

const { getAllProfiles } = require('./sheets');
const { getProfilesCache, setProfilesCache } = require('./cache');

async function getProfiles() {
    let profiles = getProfilesCache();
    if (!profiles) {
        profiles = await getAllProfiles();
        setProfilesCache(profiles);
    }
    return profiles;
}

// Returns choices for autocomplete — filters by what the user has typed so far
async function autocompleteProfiles(focusedValue) {
    const profiles = await getProfiles();
    const lower = focusedValue.toLowerCase();
    return profiles
        .filter(p => p.characterName.toLowerCase().includes(lower))
        .slice(0, 25)
        .map(p => ({ name: p.characterName, value: p.characterName }));
}

// Resolves a string (character name or <@id> mention) to { discordId, characterName }
async function resolveTarget(input) {
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    const profiles = await getProfiles();

    if (mentionMatch) {
        const discordId = mentionMatch[1];
        const profile = profiles.find(p => p.discordId === discordId);
        if (!profile) throw new Error("That user doesn't have a profile set up.");
        return { discordId, characterName: profile.characterName };
    }

    const profile = profiles.find(p => p.characterName.toLowerCase() === input.toLowerCase());
    if (!profile) throw new Error(`No profile found for character "${input}".`);
    return profile;
}

module.exports = { resolveTarget, autocompleteProfiles };
