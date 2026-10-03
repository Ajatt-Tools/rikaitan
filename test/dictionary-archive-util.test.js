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

import {mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {Uint8ArrayWriter} from '@zip.js/zip.js';
import {test} from 'vitest';
import {createDictionaryArchiveData, getDictionaryArchiveEntries} from '../dev/dictionary-archive-util.js';

test('dictionary archive keeps only the binary file bytes', async ({expect}) => {
    const directory = mkdtempSync(join(tmpdir(), 'rikaitan-archive-'));
    try {
        const expected = new Uint8Array([0, 255, 42, 128, 1]);
        writeFileSync(join(directory, 'audio.bin'), expected);

        const data = await createDictionaryArchiveData(directory);
        const entries = await getDictionaryArchiveEntries(data);
        expect(entries.map(({filename}) => filename)).toEqual(['audio.bin']);
        const entry = entries[0];
        if (typeof entry.getData === 'undefined') { throw new Error('Archive entry cannot be read'); }
        const actual = await entry.getData(new Uint8ArrayWriter());
        expect(actual).toEqual(expected);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});
