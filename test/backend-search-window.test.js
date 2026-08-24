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

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {SearchPageWindowController} from '../ext/js/background/search-page-window-controller.js';
import {createSearchWindowBrowserMock, malformedPrivateBrowsingContexts} from './fixtures/search-window-browser.js';

/** @type {import('core').SafeAny} */
let chromeMock;

beforeEach(() => {
    // Keep this browser-global mock local to each test worker and test case.
    setChromeMock();
});

/**
 * Replaces the callback-only browser APIs for a specific controller scenario.
 * @param {import('./fixtures/search-window-browser.js').SearchWindowBrowserOptions} [options]
 * @returns {void}
 */
function setChromeMock(options = {}) {
    ({chromeMock} = createSearchWindowBrowserMock(options));
    vi.stubGlobal('chrome', chromeMock);
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const testUrl = 'https://example.invalid/search.html';

/**
 * @typedef {object} SearchWindowOutcome
 * @property {string} name
 * @property {import('./fixtures/search-window-browser.js').SearchWindowBrowserOptions} [browserOptions]
 * @property {() => Partial<import('search-page-window-controller').BackendDeps>} createOverrides
 * @property {number} tabCalls
 * @property {number} windowCalls
 * @property {number} updateCalls
 */

/**
 * @type {import('search-page-window-controller').SearchPageWindowOptions}
 */
const defaultSearchPageWindowOptions = {
    openSearchPageInNewWindow: true,
    searchPageWindowType: 'normal',
    searchPageWindowState: 'normal',
};

/**
 * @param {Partial<import('search-page-window-controller').SearchPageWindowOptions>} [overrides]
 * @returns {import('search-page-window-controller').BackendDeps['getProfileOptions']}
 */
function profileOptionsWith(overrides = {}) {
    return vi.fn(() => ({
        general: {...defaultSearchPageWindowOptions, ...overrides},
    }));
}

/**
 * @param {Partial<import('search-page-window-controller').BackendDeps>} [overrides]
 * @returns {import('search-page-window-controller').BackendDeps}
 */
function createDeps(overrides = {}) {
    const createWindow = vi.fn();
    createWindow.mockResolvedValue({id: 42});
    return {
        getProfileOptions: profileOptionsWith(),
        createTab: vi.fn(),
        createWindow,
        updateWindow: vi.fn(),
        ...overrides,
    };
}

/**
 * @param {Partial<import('search-page-window-controller').BackendDeps>} [overrides]
 * @returns {{controller: SearchPageWindowController, deps: import('search-page-window-controller').BackendDeps}}
 */
function createController(overrides = {}) {
    const deps = createDeps(overrides);
    return {controller: new SearchPageWindowController(deps), deps};
}

/**
 * Returns a created window response without an ID.
 * @returns {Awaited<ReturnType<import('search-page-window-controller').BackendDeps['createWindow']>>}
 */
function windowWithoutId() {
    return {};
}

describe('SearchPageWindowController.createSearchTabOrWindow', () => {
    test.each([
        // Keep usable APIs here so this row fails if the preference is ignored.
        {name: 'the option is disabled', optionOverrides: {openSearchPageInNewWindow: false}, windowsAvailable: true},
        {name: 'windows are unavailable', optionOverrides: {}, windowsAvailable: false},
    ])('creates a tab when $name', async ({optionOverrides, windowsAvailable}) => {
        if (!windowsAvailable) { chromeMock.windows = void 0; }
        const {controller, deps} = createController({getProfileOptions: profileOptionsWith(optionOverrides)});

        await controller.createSearchTabOrWindow(testUrl);

        expect(deps.createTab).toHaveBeenCalledWith(testUrl);
        expect(deps.createWindow).not.toHaveBeenCalled();
    });

    test('creates a window with the configured type and state', async () => {
        const {controller, deps} = createController({
            getProfileOptions: profileOptionsWith({searchPageWindowType: 'popup', searchPageWindowState: 'maximized'}),
        });

        await controller.createSearchTabOrWindow(testUrl);

        expect(deps.getProfileOptions).toHaveBeenCalledWith({current: true}, false);
        expect(deps.createWindow).toHaveBeenCalledWith({url: testUrl, type: 'popup', state: 'normal', incognito: false});
        expect(deps.updateWindow).toHaveBeenCalledWith(42, {state: 'maximized'});
        expect(deps.createTab).not.toHaveBeenCalled();
    });

    test('preserves the private browsing context', async () => {
        setChromeMock({incognito: true});
        const {controller, deps} = createController();

        await controller.createSearchTabOrWindow(testUrl);

        expect(deps.createWindow).toHaveBeenCalledWith({url: testUrl, type: 'normal', state: 'normal', incognito: true});
        expect(deps.createTab).not.toHaveBeenCalled();
    });

    /** @type {SearchWindowOutcome[]} */
    const outcomes = [
        {
            name: 'creating the window fails',
            createOverrides: () => ({createWindow: vi.fn(async () => { throw new Error('windows.create is unsupported'); })}),
            tabCalls: 1,
            windowCalls: 1,
            updateCalls: 0,
        },
        {
            name: 'the service worker has not loaded options',
            createOverrides: () => ({getProfileOptions: vi.fn(() => { throw new Error('Options is null'); })}),
            tabCalls: 1,
            windowCalls: 0,
            updateCalls: 0,
        },
        {
            name: 'the private browsing context cannot be determined',
            browserOptions: {lastFocusedWindowResult: {}},
            createOverrides: () => ({}),
            tabCalls: 1,
            windowCalls: 0,
            updateCalls: 0,
        },
        ...malformedPrivateBrowsingContexts.map((incognito) => ({
            name: `the private browsing context is malformed (${JSON.stringify(incognito)})`,
            browserOptions: {incognito},
            createOverrides: () => ({}),
            tabCalls: 1,
            windowCalls: 0,
            updateCalls: 0,
        })),
        {
            name: 'getting the last-focused window reports an error',
            browserOptions: {getLastFocusedError: {message: 'getLastFocused is unsupported'}},
            createOverrides: () => ({}),
            tabCalls: 1,
            windowCalls: 0,
            updateCalls: 0,
        },
        {
            name: 'the last-focused window API is unavailable',
            // A partially implemented windows namespace must not create a regular window.
            browserOptions: {getLastFocused: false},
            createOverrides: () => ({}),
            tabCalls: 1,
            windowCalls: 0,
            updateCalls: 0,
        },
        {
            name: 'window creation returns no ID',
            createOverrides: () => ({createWindow: vi.fn(async () => windowWithoutId())}),
            tabCalls: 0,
            windowCalls: 1,
            updateCalls: 0,
        },
        {
            name: 'applying the window state fails',
            createOverrides: () => ({
                getProfileOptions: profileOptionsWith({searchPageWindowState: 'maximized'}),
                updateWindow: vi.fn(async () => { throw new Error('window update failed'); }),
            }),
            tabCalls: 0,
            windowCalls: 1,
            updateCalls: 1,
        },
    ];

    test.each(outcomes)('handles the outcome when $name', async ({browserOptions, createOverrides, tabCalls, windowCalls, updateCalls}) => {
        if (browserOptions) { setChromeMock(browserOptions); }
        const {controller, deps} = createController(createOverrides());

        await controller.createSearchTabOrWindow(testUrl);

        expect(deps.createTab).toHaveBeenCalledTimes(tabCalls);
        expect(deps.createWindow).toHaveBeenCalledTimes(windowCalls);
        expect(deps.updateWindow).toHaveBeenCalledTimes(updateCalls);
        if (tabCalls > 0) {
            // Every failed window path must preserve the original search-page destination.
            expect(deps.createTab).toHaveBeenCalledWith(testUrl);
        }
    });

    test('does not update a window whose configured state is normal', async () => {
        const {controller, deps} = createController();

        await controller.createSearchTabOrWindow(testUrl);

        expect(deps.updateWindow).not.toHaveBeenCalled();
    });
});
