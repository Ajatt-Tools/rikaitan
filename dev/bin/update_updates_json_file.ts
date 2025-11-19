/*
 * Copyright (C) 2023-2025  Ajatt-Tools and contributors
 * Copyright (C) 2020-2022  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import fs from 'fs';
import {parseJson} from '../../ext/js/core/json.js';
import type {SerializableObject} from '../../types/ext/core.d.ts';

/**
 * Main function
 */
async function main(): Promise<void> {
    // Get environment variables
    const githubRef = process.env.githubRef;
    const xpiFilePath = process.env.xpiFilePath || 'Downloads/rikaitan-firefox-selfhosted.xpi';
    const updatesFilePath = process.env.updatesFilePath || 'Downloads/updates.json';

    // Example: https://github.com/Ajatt-Tools/rikaitan/releases/download/25.11.11.0/rikaitan-firefox-selfhosted.xpi
    const githubDownloadUrl = 'https://github.com/Ajatt-Tools/rikaitan/releases/download';

    if (!githubRef) {
        console.error('Error: githubRef environment variable is required');
        process.exit(1);
    }

    // Read the updates.json file
    let updatesData: SerializableObject;
    try {
        const updatesContent = fs.readFileSync(updatesFilePath, 'utf8');
        updatesData = parseJson(updatesContent);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : `${error}`;
        console.error('Error reading updates.json:', errorMessage);
        process.exit(1);
    }

    // Add a new entry to addons
    const addons = updatesData.addons as SerializableObject;
    const addonIds = Object.keys(addons);
    if (addonIds.length === 0) {
        console.error('Error: No addons found in updates.json');
        process.exit(1);
    }
    const addonId = addonIds[0]; // Get the first addon ID
    const addon = addons[addonId] as SerializableObject;
    const updates = (addon.updates || []) as SerializableObject[];

    const newUpdate = {
        version: githubRef,
        update_link: `${githubDownloadUrl}/${githubRef}/${xpiFilePath.split('/').pop()}`,
    };

    // Add the new update to the beginning of the updates array
    updates.push(newUpdate);
    addon.updates = updates;

    // Save the updated JSON
    try {
        fs.writeFileSync(updatesFilePath, JSON.stringify(updatesData, null, 2));
        console.log('Successfully updated updates.json');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : `${error}`;
        console.error('Error writing updates.json:', errorMessage);
        process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
