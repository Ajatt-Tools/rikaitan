/*
 * Copyright (C) 2026  Ajatt-Tools and contributors
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
import JSZip from 'jszip';
import {parseJson} from '../../ext/js/core/json.js';

/**
 * Check whether an unknown manifest has a usable extension version.
 * @param manifest Parsed manifest content.
 * @returns Whether the manifest provides a nonempty string version.
 */
function isManifestWithVersion(manifest: unknown): manifest is {version: string} {
    if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest) || !('version' in manifest)) {
        return false;
    }
    return typeof manifest.version === 'string' && manifest.version.length > 0;
}

/**
 * Read the authoritative add-on version from an XPI manifest.
 * @param xpiFilePath Path to the signed XPI file.
 * @returns The nonempty manifest version.
 */
async function extractAddonVersion(xpiFilePath: string): Promise<string> {
    const archive = await JSZip.loadAsync(fs.readFileSync(xpiFilePath));
    const manifestFile = archive.file('manifest.json');
    if (manifestFile === null) {
        throw new Error('XPI archive does not contain manifest.json');
    }

    const manifest = parseJson<unknown>(await manifestFile.async('text'));
    if (!isManifestWithVersion(manifest)) {
        throw new Error('XPI manifest.json must contain a nonempty string version');
    }
    return manifest.version;
}

/**
 * Print the version embedded in the XPI path passed on the command line.
 * @returns A promise that resolves when the version has been printed.
 */
async function main(): Promise<void> {
    const xpiFilePath = process.argv[2];
    if (!xpiFilePath) {
        throw new Error('XPI file path is required');
    }
    process.stdout.write(`${await extractAddonVersion(xpiFilePath)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await main();
    } catch (error: unknown) {
        console.error(`Error: ${error instanceof Error ? error.message : `${error}`}`);
        process.exitCode = 1;
    }
}
