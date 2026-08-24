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

import {describe, expect, test, vi} from 'vitest';
import {OptionsUtil} from '../ext/js/data/options-util.js';
import {chrome, fetch} from './mocks/common.js';

vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

/**
 * Creates a prepared options utility.
 * @returns {Promise<OptionsUtil>}
 */
async function createOptionsUtil() {
    const optionsUtil = new OptionsUtil();
    await optionsUtil.prepare();
    return optionsUtil;
}

/**
 * Returns the search-window options from each profile.
 * @param {import('settings').Options} options
 * @returns {Pick<import('settings').GeneralOptions, 'openSearchPageInNewWindow'|'searchPageWindowType'|'searchPageWindowState'>[]}
 */
function getSearchPageWindowOptions(options) {
    return options.profiles.map(({options: {general}}) => ({
        openSearchPageInNewWindow: general.openSearchPageInNewWindow,
        searchPageWindowType: general.searchPageWindowType,
        searchPageWindowState: general.searchPageWindowState,
    }));
}

describe('OptionsUtil search page window options', () => {
    test('UpdateVersion78 resets search page window options in every profile', async () => {
        const optionsUtil = await createOptionsUtil();
        const options = optionsUtil.getDefault();
        options.version = 77;
        options.profiles.push(structuredClone(options.profiles[0]));
        for (const {options: {general}} of options.profiles) {
            general.openSearchPageInNewWindow = false;
            general.searchPageWindowType = 'popup';
            general.searchPageWindowState = 'fullscreen';
        }

        const updatedOptions = await optionsUtil.update(options);

        expect(updatedOptions.version).toBe(78);
        expect(getSearchPageWindowOptions(updatedOptions)).toStrictEqual([
            {openSearchPageInNewWindow: true, searchPageWindowType: 'normal', searchPageWindowState: 'normal'},
            {openSearchPageInNewWindow: true, searchPageWindowType: 'normal', searchPageWindowState: 'normal'},
        ]);
    });

    test('preserves valid non-default search page window preferences at the current version', async () => {
        const optionsUtil = await createOptionsUtil();
        const options = optionsUtil.getDefault();
        const {general} = options.profiles[0].options;
        // Migration establishes the new default once; later validation must preserve a user's opt-out and style choices.
        general.openSearchPageInNewWindow = false;
        general.searchPageWindowType = 'popup';
        general.searchPageWindowState = 'fullscreen';

        const updatedOptions = await optionsUtil.update(options);

        expect(getSearchPageWindowOptions(updatedOptions)).toStrictEqual([
            {openSearchPageInNewWindow: false, searchPageWindowType: 'popup', searchPageWindowState: 'fullscreen'},
        ]);
    });

    test.each([
        {
            name: 'the dedicated-window toggle has the wrong type',
            setInvalidValue: (/** @type {import('settings').GeneralOptions} */ general) => {
                general.openSearchPageInNewWindow = /** @type {boolean} */ (/** @type {unknown} */ ('true'));
            },
            expected: {openSearchPageInNewWindow: true, searchPageWindowType: 'popup', searchPageWindowState: 'fullscreen'},
        },
        {
            name: 'the window type is invalid',
            setInvalidValue: (/** @type {import('settings').GeneralOptions} */ general) => {
                general.searchPageWindowType = /** @type {import('settings').PopupWindowType} */ (/** @type {unknown} */ ('panel'));
            },
            expected: {openSearchPageInNewWindow: false, searchPageWindowType: 'normal', searchPageWindowState: 'fullscreen'},
        },
        {
            name: 'the window state is invalid',
            setInvalidValue: (/** @type {import('settings').GeneralOptions} */ general) => {
                general.searchPageWindowState = /** @type {import('settings').PopupWindowState} */ (/** @type {unknown} */ ('minimized'));
            },
            expected: {openSearchPageInNewWindow: false, searchPageWindowType: 'popup', searchPageWindowState: 'normal'},
        },
    ])('normalizes only the invalid setting when $name', async ({setInvalidValue, expected}) => {
        const optionsUtil = await createOptionsUtil();
        const options = optionsUtil.getDefault();
        const {general} = options.profiles[0].options;
        // Preserve non-default siblings to detect broad resets during schema normalization.
        general.openSearchPageInNewWindow = false;
        general.searchPageWindowType = 'popup';
        general.searchPageWindowState = 'fullscreen';
        setInvalidValue(general);

        const updatedOptions = await optionsUtil.update(options);

        expect(getSearchPageWindowOptions(updatedOptions)).toStrictEqual([
            expected,
        ]);
    });
});
