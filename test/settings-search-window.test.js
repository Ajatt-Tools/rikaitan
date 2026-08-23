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

import {describe, expect, vi} from 'vitest';
import {GenericSettingController} from '../ext/js/pages/settings/generic-setting-controller.js';
import {createDomTest} from './fixtures/dom-test.js';

const test = createDomTest('ext/settings.html');

/**
 * Creates a settings-controller surface backed by mutable test values.
 * @param {Record<string, boolean|string>} values
 * @returns {{settingsController: ConstructorParameters<typeof GenericSettingController>[0], modifySettings: import('vitest').Mock}}
 */
function createSettingsController(values) {
    /**
     * @param {import('settings-modifications').ScopedRead[]} targets
     * @returns {Promise<{result: boolean|string}[]>}
     */
    const getSettings = async (targets) => targets.map(({path}) => ({result: values[path]}));
    /**
     * @param {import('settings-modifications').ScopedModification[]} targets
     * @returns {Promise<unknown[]>}
     */
    const modifySettingsFunction = async (targets) => targets.map((target) => {
        if (target.action !== 'set') {
            throw new Error(`Unexpected test setting action: ${target.action}.`);
        }
        const {path, value} = target;
        if (typeof value !== 'boolean' && typeof value !== 'string') {
            throw new Error(`Unexpected test setting value for ${path}.`);
        }
        values[path] = value;
        return {result: value};
    });
    const modifySettings = vi.fn(modifySettingsFunction);
    const settingsController = /** @type {ConstructorParameters<typeof GenericSettingController>[0]} */ (
        /** @type {unknown} */ ({
            getSettings,
            modifySettings,
            on: vi.fn(),
        })
    );
    return {settingsController, modifySettings};
}

/**
 * Loads the generic settings binder with the supplied search-window values.
 * @param {boolean} enabled
 * @returns {Promise<{dispose: () => void, modifySettings: import('vitest').Mock}>}
 */
async function prepareGenericSettingController(enabled) {
    const {settingsController, modifySettings} = createSettingsController({
        'general.openSearchPageInNewWindow': enabled,
        'general.searchPageWindowType': 'popup',
        'general.searchPageWindowState': 'maximized',
    });
    const genericSettingController = new GenericSettingController(settingsController);
    await genericSettingController.prepare();
    await genericSettingController.refresh();
    return {
        dispose: () => {
            // Disconnect before the DOM fixture removes its browser globals.
            // eslint-disable-next-line no-underscore-dangle
            genericSettingController._dataBinder.disconnect();
        },
        modifySettings,
    };
}

describe('Search Window settings visibility', () => {
    test('keeps the sidebar link and section visible in basic mode', ({window}) => {
        const {document} = window;
        const sidebarLink = document.querySelector('a[href="#window"]');
        const section = document.querySelector('#window')?.closest('.heading-container');
        expect(sidebarLink?.classList.contains('advanced-only')).toBe(false);
        expect(section?.classList.contains('advanced-only')).toBe(false);
    });

    test('keeps pre-existing Search Window controls advanced-only', ({window}) => {
        const {document} = window;
        const controlSelectors = [
            '[data-setting="general.stickySearchHeader"]',
            '[data-setting="general.usePopupWindow"]',
            '[data-setting="popupWindow.width"]',
            '[data-setting="popupWindow.left"]',
            '[data-setting="popupWindow.top"]',
            '[data-setting="popupWindow.windowType"]',
        ];
        const testWindowLink = document.querySelector('#test-window-open-link');
        expect(testWindowLink?.closest('.heading-container-right')?.classList.contains('advanced-only')).toBe(true);
        for (const selector of controlSelectors) {
            const control = document.querySelector(selector);
            expect(control?.closest('.settings-group')?.classList.contains('advanced-only')).toBe(true);
        }
    });

    test('renders all basic Search Window controls', ({window}) => {
        const {document} = window;
        for (const {setting, tagName, values} of [
            {setting: 'general.openSearchPageInNewWindow', tagName: 'INPUT', values: []},
            {setting: 'general.searchPageWindowType', tagName: 'SELECT', values: ['normal', 'popup']},
            {setting: 'general.searchPageWindowState', tagName: 'SELECT', values: ['normal', 'maximized', 'fullscreen']},
        ]) {
            const control = document.querySelector(`[data-setting="${setting}"]`);
            expect(control?.tagName).toBe(tagName);
            expect(control?.closest('.settings-group')?.classList.contains('advanced-only')).toBe(false);
            expect([...control?.querySelectorAll('option') ?? []].map(({value}) => value)).toStrictEqual(values);
        }
    });

    test('shows window style controls only when dedicated windows are enabled', async ({window}) => {
        const {document} = window;
        for (const {enabled, hidden} of [{enabled: true, hidden: false}, {enabled: false, hidden: true}]) {
            const {dispose} = await prepareGenericSettingController(enabled);
            const toggle = document.querySelector('[data-setting="general.openSearchPageInNewWindow"]');
            expect(toggle?.getAttribute('type')).toBe('checkbox');
            const styleContainer = /** @type {HTMLElement} */ (document.querySelector('#search-page-window-style-container'));
            expect(styleContainer.hidden).toBe(hidden);
            expect(/** @type {HTMLInputElement} */ (toggle).checked).toBe(enabled);
            const windowType = /** @type {HTMLSelectElement} */ (document.querySelector('[data-setting="general.searchPageWindowType"]'));
            const windowState = /** @type {HTMLSelectElement} */ (document.querySelector('[data-setting="general.searchPageWindowState"]'));
            expect(windowType.value).toBe('popup');
            expect(windowState.value).toBe('maximized');
            dispose();
        }
    });

    test('updates window-style visibility and persists the setting after toggling the checkbox', async ({window}) => {
        const {document} = window;
        const {dispose, modifySettings} = await prepareGenericSettingController(true);
        const toggle = /** @type {HTMLInputElement} */ (document.querySelector('[data-setting="general.openSearchPageInNewWindow"]'));
        const container = /** @type {HTMLElement} */ (document.querySelector('#search-page-window-style-container'));

        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        await vi.waitFor(() => expect(modifySettings).toHaveBeenCalled());

        expect(container.hidden).toBe(true);
        expect(modifySettings).toHaveBeenCalledWith([expect.objectContaining({
            path: 'general.openSearchPageInNewWindow', value: false,
        })]);
        dispose();
    });

    test('keeps scan-popup geometry controls out of the basic Search Window group', ({window}) => {
        const {document} = window;
        const toggle = document.querySelector('[data-setting="general.openSearchPageInNewWindow"]');
        const basicGroup = toggle?.closest('.settings-group');
        const geometryControls = basicGroup?.querySelectorAll('[data-setting^="popupWindow."]');
        expect([...geometryControls ?? []]).toStrictEqual([]);
    });
});
