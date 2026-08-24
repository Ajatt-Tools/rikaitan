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

import {afterEach, describe, expect, test, vi} from 'vitest';
import {Backend} from '../ext/js/background/backend.js';
import {createSearchWindowBrowserMock, malformedPrivateBrowsingContexts} from './fixtures/search-window-browser.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * Creates a backend shell with only the dependencies needed by these tests.
 * @param {object} overrides
 * @returns {Backend}
 */
function createBackend(overrides) {
    // The command handler is tested without the Backend constructor's unrelated setup.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const backend = /** @type {Backend} */ (Object.create(Backend.prototype));
    Object.assign(backend, overrides);
    return backend;
}

/**
 * Creates the common browser and controller dependencies for a command test.
 * @param {object} [overrides]
 * @returns {{
 *     backend: Backend,
 *     createTab: import('vitest').Mock,
 *     createSearchTabOrWindow: import('vitest').Mock,
 * }}
 */
function createCommandTestContext(overrides = {}) {
    vi.stubGlobal('chrome', {runtime: {getURL: vi.fn(() => 'chrome-extension://test/search.html')}});
    const createTab = vi.fn(async () => {});
    const createSearchTabOrWindow = vi.fn(async () => {});
    return {
        backend: createBackend({
            _createTab: createTab,
            _searchPageWindowController: {createSearchTabOrWindow},
            ...overrides,
        }),
        createTab,
        createSearchTabOrWindow,
    };
}

/**
 * Creates a command backend using the constructor-created window controller
 * and Backend callback wrappers.
 * @param {import('./fixtures/search-window-browser.js').SearchWindowBrowserOptions & {optionsAvailable?: boolean}} [options]
 * @returns {{backend: Backend, createTab: import('vitest').Mock, createWindow: import('vitest').Mock, getLastFocused: import('vitest').Mock, updateWindow: import('vitest').Mock}}
 */
function createIntegratedCommandTestContext(options = {}) {
    const {optionsAvailable = true, updateWindowError, updateWindow: updateWindowAvailable = true} = options;
    const {chromeMock, createTab, createWindow, getLastFocused, updateWindow} = createSearchWindowBrowserMock(options);
    vi.stubGlobal('chrome', chromeMock);
    // Use the constructor so this test detects broken controller dependency wiring.
    const backend = new Backend(/** @type {import('../ext/js/extension/web-extension.js').WebExtension} */ ({}));
    /* eslint-disable no-underscore-dangle */
    if (optionsAvailable) {
        backend._options = /** @type {import('settings').Options} */ (/** @type {unknown} */ ({
            profileCurrent: 0,
            profiles: [{options: {
                general: {
                    openSearchPageInNewWindow: true,
                    searchPageWindowType: 'normal',
                    // A non-normal state ensures unavailable update APIs exercise Backend's wrapper path.
                    searchPageWindowState: updateWindowError || !updateWindowAvailable ? 'maximized' : 'normal',
                },
            }}],
        }));
    }
    backend._findTabs = vi.fn(async () => null);
    /* eslint-enable no-underscore-dangle */
    return {backend, createTab, createWindow, getLastFocused, updateWindow};
}

describe('Backend._onCommandOpenSearchPage', () => {
    test.each([
        {
            name: 'newTab',
            mode: /** @type {import('backend').Mode} */ ('newTab'),
            overrides: {_normalizeOpenSettingsPageMode: vi.fn(() => 'newTab')},
            expectedTabCall: 'create',
        },
        {
            name: 'existingOrCurrentTab',
            mode: /** @type {import('backend').Mode} */ ('existingOrCurrentTab'),
            overrides: {
                _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrCurrentTab'),
                _findTabs: vi.fn(async () => null),
                _updateTab: vi.fn(async () => {}),
            },
            expectedTabCall: 'update',
        },
    ])('opens an explicit $name command in a tab when the window preference is enabled', async ({mode, overrides, expectedTabCall}) => {
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext(overrides);

        // Explicitly tab-scoped commands must not inherit the default window behavior.
        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode, query: 'query'});

        const url = 'chrome-extension://test/search.html?query=query';
        if (expectedTabCall === 'create') {
            expect(createTab).toHaveBeenCalledWith(url);
        } else {
            // eslint-disable-next-line no-underscore-dangle
            expect(overrides._updateTab).toHaveBeenCalledWith(url);
        }
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });

    test('delegates the parameterless default command to the search window controller when no search tab exists', async () => {
        const normalizeOpenSettingsPageMode = vi.fn();
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: normalizeOpenSettingsPageMode,
            _findTabs: vi.fn(async () => null),
        });

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(normalizeOpenSettingsPageMode).not.toHaveBeenCalled();
        expect(createSearchTabOrWindow).toHaveBeenCalledWith('chrome-extension://test/search.html');
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {name: 'a regular window', incognito: false},
        {name: 'a private window', incognito: true},
    ])('opens a dedicated search window from $name through Backend callback wrappers', async ({incognito}) => {
        const {backend, createTab, createWindow, getLastFocused} = createIntegratedCommandTestContext({incognito});

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledWith({
            url: 'chrome-extension://test/search.html', type: 'normal', state: 'normal', incognito,
        }, expect.any(Function));
        expect(getLastFocused).toHaveBeenCalledWith({}, expect.any(Function));
        expect(createWindow).toHaveBeenCalledTimes(1);
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {
            name: 'window creation reports a browser error',
            options: {createWindowError: {message: 'creation failed'}},
            windowCalls: 1,
        },
        // These must traverse Backend's callback wrappers, not just controller mocks.
        {name: 'the windows.create API is missing', options: {createWindow: false}, windowCalls: 0},
        {name: 'options are unavailable during service-worker startup', options: {optionsAvailable: false}, windowCalls: 0},
        {name: 'the last-focused-window API is missing', options: {getLastFocused: false}, windowCalls: 0},
        {name: 'getting the last-focused window reports a browser error', options: {getLastFocusedError: {message: 'lookup failed'}}, windowCalls: 0},
        {name: 'the private browsing context is missing', options: {lastFocusedWindowResult: {}}, windowCalls: 0},
        ...malformedPrivateBrowsingContexts.map((incognito) => ({
            name: `the private browsing context is malformed (${JSON.stringify(incognito)})`, options: {incognito}, windowCalls: 0,
        })),
    ])('falls back to a tab when $name through Backend callback wrappers', async ({options, windowCalls}) => {
        const {backend, createTab, createWindow} = createIntegratedCommandTestContext(options);

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createTab).toHaveBeenCalledWith({url: 'chrome-extension://test/search.html'}, expect.any(Function));
        expect(createTab).toHaveBeenCalledTimes(1);
        expect(createWindow).toHaveBeenCalledTimes(windowCalls);
    });

    test('does not create a second page when windows.create omits its result', async () => {
        const {backend, createTab, createWindow} = createIntegratedCommandTestContext({windowResult: void 0});

        // The browser accepted creation; retrying in a tab could create a duplicate search page.
        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledTimes(1);
        expect(createTab).not.toHaveBeenCalled();
    });

    test('does not open a fallback tab when applying the optional window state reports a browser error', async () => {
        const {backend, createTab, createWindow, updateWindow} = createIntegratedCommandTestContext({
            updateWindowError: {message: 'state update failed'},
        });

        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledTimes(1);
        // Assert wrapper arguments as well as the fallback behavior at the Backend/controller seam.
        expect(updateWindow).toHaveBeenCalledWith(2, {state: 'maximized'}, expect.any(Function));
        expect(createTab).not.toHaveBeenCalled();
    });

    test('does not open a fallback tab when windows.update is unavailable after creation', async () => {
        const {backend, createTab, createWindow, updateWindow} = createIntegratedCommandTestContext({updateWindow: false});

        // State application is optional; a partially implemented API must not duplicate the created page.
        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(createWindow).toHaveBeenCalledTimes(1);
        expect(updateWindow).not.toHaveBeenCalled();
        expect(createTab).not.toHaveBeenCalled();
    });

    test.each([
        {
            name: 'search tab discovery fails',
            findTabs: vi.fn(async () => { throw new Error('tabs query failed'); }),
        },
        {
            name: 'focusing an existing search tab fails',
            findTabs: vi.fn(async () => ({tab: {id: 42}})),
            focusTab: vi.fn(async () => { throw new Error('tab focus failed'); }),
        },
        {
            name: 'updating an existing search query fails',
            findTabs: vi.fn(async () => ({tab: {id: 42}})),
            focusTab: vi.fn(async () => {}),
            updateSearchQuery: vi.fn(async () => { throw new Error('query update failed'); }),
        },
    ])('delegates to the controller when $name', async ({findTabs, focusTab, updateSearchQuery}) => {
        const {backend, createTab, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrNewTab'),
            _findTabs: findTabs,
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
        });

        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode: 'existingOrNewTab', query: 'query'});

        expect(createSearchTabOrWindow).toHaveBeenCalledWith('chrome-extension://test/search.html?query=query');
        expect(createTab).not.toHaveBeenCalled();
    });

    test('focuses an existing search tab and updates its query', async () => {
        const focusTab = vi.fn(async () => {});
        const updateSearchQuery = vi.fn(async () => {});
        const {backend, createSearchTabOrWindow} = createCommandTestContext({
            _normalizeOpenSettingsPageMode: vi.fn(() => 'existingOrNewTab'),
            _findTabs: vi.fn(async () => ({tab: {id: 42}})),
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
        });
        // eslint-disable-next-line no-underscore-dangle
        await backend._onCommandOpenSearchPage({mode: 'existingOrNewTab', query: 'query'});

        expect(focusTab).toHaveBeenCalledWith({id: 42});
        expect(updateSearchQuery).toHaveBeenCalledWith(42, 'query', true);
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });

    test('discovers and focuses an ordinary search page after it moves to another window', async () => {
        const focusTab = vi.fn(async () => {});
        const updateSearchQuery = vi.fn(async () => {});
        const {backend, createSearchTabOrWindow} = createCommandTestContext({
            _focusTab: focusTab,
            _updateSearchQuery: updateSearchQuery,
            // Keep discovery real so the command remains protected against a future current-window query.
            _getTabUrl: vi.fn(async (tabId) => {
                return tabId === 42 ? 'https://extension.test/search.html' : 'https://example.invalid/';
            }),
        });
        /** @type {import('vitest').Mock} */ (chrome.runtime.getURL).mockReturnValue('https://extension.test/search.html');
        const queryTabs = vi.fn((queryInfo, callback) => {
            // Different window IDs prove discovery is not scoped to the command's source window.
            callback([
                {id: 1, windowId: 1},
                {id: 42, windowId: 99},
            ]);
            void queryInfo;
        });
        // This is intentionally callback-only: Backend must support browsers without the Promise overload.
        chrome.tabs = /** @type {import('core').SafeAny} */ ({query: queryTabs});

        // The parameterless command is the default path whose global discovery must survive tab moves.
        // eslint-disable-next-line no-underscore-dangle, no-undefined, unicorn/no-useless-undefined
        await backend._onCommandOpenSearchPage(undefined);

        expect(queryTabs).toHaveBeenCalledWith({}, expect.any(Function));
        expect(focusTab).toHaveBeenCalledWith({id: 42, windowId: 99});
        expect(updateSearchQuery).not.toHaveBeenCalled();
        expect(createSearchTabOrWindow).not.toHaveBeenCalled();
    });
});
