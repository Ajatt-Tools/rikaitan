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

import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestType,
} from '@playwright/test';

export interface ExtensionTestArgs {
    extensionId: string;
}

type BaseTestArgs = PlaywrightTestArgs & PlaywrightTestOptions;

type BaseWorkerArgs = PlaywrightWorkerArgs & PlaywrightWorkerOptions;

// Playwright 1.62 needs the custom fixture typed explicitly when a built-in fixture is also overridden.
type AllExtensionFixtures = Fixtures<
    ExtensionTestArgs,
    Record<never, never>,
    BaseTestArgs,
    BaseWorkerArgs
>;

export type ExtensionFixtures = Pick<AllExtensionFixtures, keyof ExtensionTestArgs>;

export type ExtensionTest = TestType<BaseTestArgs & ExtensionTestArgs, BaseWorkerArgs>;
