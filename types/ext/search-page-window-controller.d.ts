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

export type SearchPageWindowOptions = Pick<import('settings').GeneralOptions,
    'openSearchPageInNewWindow' | 'searchPageWindowType' | 'searchPageWindowState'>;

export type BackendDeps = {
    getProfileOptions: (
        optionsContext: import('settings').OptionsContext,
        useSchema: boolean,
    ) => {general: SearchPageWindowOptions};
    createTab: (url: string) => Promise<unknown>;
    createWindow: (createData: chrome.windows.CreateData) => Promise<Pick<chrome.windows.Window, 'id'>>;
    updateWindow: (
        windowId: number,
        updateInfo: chrome.windows.UpdateInfo,
    ) => Promise<unknown>;
};
