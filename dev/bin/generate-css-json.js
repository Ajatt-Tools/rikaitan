/*
 * Copyright (C) 2023-2025  Ajatt-Tools and contributors
 * Copyright (C) 2020-2022  Yomichan Authors
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
import {formatRulesJson, generateRules, getTargets} from '../generate-css-json.js';

/** */
function main() {
    for (const {cssFilePath, overridesCssFilePath, outputPath} of getTargets()) {
        const json = formatRulesJson(generateRules(cssFilePath, overridesCssFilePath));
        fs.writeFileSync(outputPath, json, {encoding: 'utf8'});
    }
}

main();
