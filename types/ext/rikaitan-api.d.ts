/*
 * Copyright (C) 2025  Ajatt-Tools and contributors
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

export type termEntriesInput = {
    term: string;
};

export type kanjiEntriesInput = {
    character: string;
};

export type ankiFieldsInput = {
    text: string;
    type: 'term' | 'kanji';
    markers: [string];
    maxEntries: number;
    includeMedia?: boolean;
};

export type remoteVersionResponse = {
    version: number;
};

export type apiDictionaryMediaDetails = {
    dictionary: string;
    path: string;
    mediaType: string;
    width: number;
    height: number;
    content: TContentType;
    ankiFilename: string;
};

export type apiAudioMediaDetails = {
    term: string;
    reading: string;
    mediaType: string;
    content: AudioBinaryBase64;
    ankiFilename: string;
};
