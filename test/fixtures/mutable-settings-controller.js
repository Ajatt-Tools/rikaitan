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

import {vi} from 'vitest';
import {GenericSettingController} from '../../ext/js/pages/settings/generic-setting-controller.js';

/**
 * Provides the subset of SettingsController used by generic-setting tests.
 * Values are updated after a set operation so visibility transforms observe
 * the same state that the settings page would persist.
 */
export class MutableSettingsController {
    /**
     * @param {Record<string, boolean|string>} values
     */
    constructor(values) {
        /** @type {Record<string, boolean|string>} */
        this._values = values;
        /** @type {import('vitest').Mock} */
        this.modifySettings = vi.fn(this._modifySettings.bind(this));
    }

    /**
     * @param {import('settings-modifications').ScopedRead[]} targets
     * @returns {Promise<{result: boolean|string}[]>}
     */
    async getSettings(targets) {
        return targets.map(({path}) => ({result: this._values[path]}));
    }

    /**
     * @param {import('settings-modifications').ScopedModification[]} targets
     * @returns {Promise<{result: boolean|string}[]>}
     */
    async _modifySettings(targets) {
        return targets.map((target) => this._setValue(target));
    }

    /**
     * Rejects unsupported mutations so test failures identify binder regressions.
     * @param {import('settings-modifications').ScopedModification} target
     * @returns {{result: boolean|string}}
     * @throws {Error} When a test receives an unsupported settings mutation.
     */
    _setValue(target) {
        if (target.action !== 'set') { throw new Error(`Unexpected test setting action: ${target.action}.`); }
        // Search-window controls are profile settings without a profile-selection override.
        if (target.scope !== 'profile' || target.optionsContext !== null) {
            throw new Error(`Unexpected test setting scope for ${target.path}.`);
        }
        if (typeof target.value !== 'boolean' && typeof target.value !== 'string') {
            throw new Error(`Unexpected test setting value for ${target.path}.`);
        }
        this._values[target.path] = target.value;
        return {result: target.value};
    }

    /**
     * Returns a settings-controller dependency with no unrelated behavior.
     * @returns {ConstructorParameters<typeof GenericSettingController>[0]}
     */
    createDependency() {
        return /** @type {ConstructorParameters<typeof GenericSettingController>[0]} */ (
            /** @type {unknown} */ ({getSettings: this.getSettings.bind(this), modifySettings: this.modifySettings, on: vi.fn()})
        );
    }
}
