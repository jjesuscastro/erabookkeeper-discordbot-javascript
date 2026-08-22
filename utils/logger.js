const util = require('util');

function getTimestamp() {
    return new Date().toISOString();
}

function formatUser(user) {
    if (!user) return 'unknown-user';
    return `${user.tag ?? user.username ?? 'unknown'} (${user.id ?? 'no-id'})`;
}

function formatChannel(channel) {
    if (!channel) return 'unknown-channel';
    return `${channel.name ? `#${channel.name} ` : ''}(${channel.id ?? 'no-id'})`;
}

function formatCommandOptions(interaction) {
    const options = interaction.options?.data ?? [];
    if (options.length === 0) return {};

    return Object.fromEntries(options.map(option => {
        if (option.options?.length) {
            return [option.name, Object.fromEntries(option.options.map(child => [child.name, child.value]))];
        }
        return [option.name, option.value];
    }));
}

function describeInteraction(interaction) {
    const base = {
        interactionId: interaction.id,
        user: formatUser(interaction.user),
        guildId: interaction.guildId ?? null,
        channel: formatChannel(interaction.channel),
    };

    if (interaction.isChatInputCommand?.()) {
        return {
            ...base,
            type: 'chat-input-command',
            command: `/${interaction.commandName}`,
            options: formatCommandOptions(interaction),
        };
    }

    if (interaction.isAutocomplete?.()) {
        return {
            ...base,
            type: 'autocomplete',
            command: `/${interaction.commandName}`,
            focused: interaction.options?.getFocused?.(true) ?? null,
        };
    }

    if (interaction.isMessageComponent?.()) {
        return {
            ...base,
            type: 'message-component',
            customId: interaction.customId,
            values: interaction.values ?? undefined,
        };
    }

    return { ...base, type: interaction.type };
}

function collectErrorDetails(error, seen = new Set(), depth = 0) {
    if (!error || seen.has(error) || depth > 5) return [];
    seen.add(error);

    const details = [];
    const header = {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
        method: error.method,
        url: error.url,
        requestBody: error.requestBody,
    };

    details.push(header);

    if (error.stack) {
        details.push(error.stack);
    }

    const nestedErrors = [];
    if (Array.isArray(error.errors)) nestedErrors.push(...error.errors);
    if (error.errors instanceof Map) {
        for (const [key, value] of error.errors) nestedErrors.push({ key, value });
    }
    if (error.cause) nestedErrors.push(error.cause);

    for (const nested of nestedErrors) {
        if (nested?.value) {
            details.push({ nestedKey: nested.key });
            details.push(...collectErrorDetails(nested.value, seen, depth + 1));
        } else {
            details.push(...collectErrorDetails(nested, seen, depth + 1));
        }
    }

    return details;
}

function logCommandUsage(interaction) {
    console.log(`[${getTimestamp()}] Command used`, util.inspect(describeInteraction(interaction), {
        depth: 5,
        colors: false,
        maxArrayLength: 50,
    }));
}

function logAutocompleteUsage(interaction) {
    console.log(`[${getTimestamp()}] Autocomplete used`, util.inspect(describeInteraction(interaction), {
        depth: 5,
        colors: false,
        maxArrayLength: 50,
    }));
}

function logInteractionError(label, error, interaction, extra = {}) {
    const payload = {
        label,
        interaction: interaction ? describeInteraction(interaction) : undefined,
        extra,
        errorDetails: collectErrorDetails(error),
    };

    console.error(`[${getTimestamp()}] ${label}`, util.inspect(payload, {
        depth: 12,
        colors: false,
        maxArrayLength: 100,
        maxStringLength: 8000,
    }));
}

module.exports = {
    logAutocompleteUsage,
    logCommandUsage,
    logInteractionError,
};
