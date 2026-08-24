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

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import {fileURLToPath} from 'node:url';
import path from 'path';
import JSZip from 'jszip';
import {describe, expect, test} from 'vitest';
import {parseJson} from '../ext/js/core/json.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(dirname, '..');
const selfhostedXpiName = 'rikaitan-firefox-selfhosted.xpi';

/**
 * Run an npm script through the same interface used by GitHub Actions.
 * @param {string} script Script name.
 * @param {string[]} args Script arguments.
 * @param {Record<string, string | undefined>} environment Additional environment variables.
 * @returns {childProcess.SpawnSyncReturns<string>} Result of the npm process.
 */
function runNpmScript(script, args, environment = {}) {
    return childProcess.spawnSync('npm', ['run-script', '--silent', script, '--', ...args], {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {...process.env, ...environment},
    });
}

/**
 * Create an XPI archive with optional root manifest content.
 * @param {string} xpiFilePath Archive output path.
 * @param {string | null} manifestContent Root manifest content, or null to omit it.
 * @returns {Promise<void>} A promise that resolves after the archive is written.
 */
async function writeXpi(xpiFilePath, manifestContent) {
    const archive = new JSZip();
    if (manifestContent !== null) {
        archive.file('manifest.json', manifestContent);
    }
    fs.writeFileSync(xpiFilePath, await archive.generateAsync({type: 'nodebuffer'}));
}

/**
 * Run an action with an isolated temporary directory.
 * @param {(directory: string) => Promise<void>} action Test action.
 * @returns {Promise<void>} A promise that resolves after temporary files are removed.
 */
async function withTemporaryDirectory(action) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rikaitan-addon-version-'));
    try {
        await action(directory);
    } finally {
        fs.rmSync(directory, {force: true, recursive: true});
    }
}

describe('self-hosted add-on version', () => {
    test('uses the XPI manifest version instead of the GitHub release tag', async () => {
        await withTemporaryDirectory(async (directory) => {
            const xpiFilePath = path.join(directory, selfhostedXpiName);
            await writeXpi(xpiFilePath, '{"manifest_version": 2, "version": "25.11.11.1"}');

            const versionResult = runNpmScript('extract-addon-version', [xpiFilePath]);
            expect(versionResult.status).toBe(0);
            expect(versionResult.stdout.trim()).toBe('25.11.11.1');

            const updatesFilePath = path.join(directory, 'updates.json');
            fs.writeFileSync(updatesFilePath, JSON.stringify({addons: {'rikaitan@example.com': {updates: []}}}));
            const updateResult = runNpmScript('update_updates_json_file', [], {
                githubRef: '25.11.11.0',
                updatesFilePath,
                xpiFilePath: `Downloads/${selfhostedXpiName}`,
                xpiFileVersion: versionResult.stdout.trim(),
            });

            expect(updateResult.status).toBe(0);
            const updatesData = /** @type {{addons: Record<string, {updates: Array<{update_link: string, version: string}>}>}} */ (
                parseJson(fs.readFileSync(updatesFilePath, 'utf8'))
            );
            expect(updatesData.addons['rikaitan@example.com'].updates).toStrictEqual([{
                update_link: `https://github.com/Ajatt-Tools/rikaitan/releases/download/25.11.11.0/${selfhostedXpiName}`,
                version: '25.11.11.1',
            }]);
        });
    });

    test.each([
        {name: 'missing manifest', manifestContent: null, error: 'does not contain manifest.json'},
        {name: 'invalid manifest JSON', manifestContent: '{', error: 'Error:'},
        {name: 'missing manifest version', manifestContent: '{"manifest_version": 2}', error: 'must contain a nonempty string version'},
        {name: 'empty manifest version', manifestContent: '{"version": ""}', error: 'must contain a nonempty string version'},
    ])('rejects an XPI with $name', async ({manifestContent, error}) => {
        await withTemporaryDirectory(async (directory) => {
            const xpiFilePath = path.join(directory, selfhostedXpiName);
            await writeXpi(xpiFilePath, manifestContent);

            const result = runNpmScript('extract-addon-version', [xpiFilePath]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain(error);
        });
    });
});
