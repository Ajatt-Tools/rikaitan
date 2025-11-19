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

import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import path from 'path';
import {parseJson} from '../../ext/js/core/json.js';
import type {SerializableObject} from '../../types/ext/core.d.ts';

/**
 * Types for Mozilla Add-ons API responses
 */
type AddonVersion = {
    channel: string;
    is_disabled: boolean;
    file: {
        status: string;
        url: string;
    };
};

/**
 * Creates a JWT token for authenticating with the Mozilla Add-ons API
 * @param issuer JWT issuer (API key)
 * @param secret JWT secret (API secret)
 * @returns JWT token
 */
function createJWT(issuer: string, secret: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({
        alg: 'HS256',
        typ: 'JWT',
    })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: issuer,
        jti: Math.random().toString(36).substring(2),
        iat: issuedAt,
        exp: issuedAt + 60,
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

/**
 * Makes an authenticated request to the Mozilla Add-ons API
 * @param url API endpoint URL
 * @param jwtIssuer JWT issuer (API key)
 * @param jwtSecret JWT secret (API secret)
 * @returns API response data
 */
function makeAuthenticatedRequest(url: string, jwtIssuer: string, jwtSecret: string): Promise<SerializableObject> {
    return new Promise((resolve, reject) => {
        const jwt = createJWT(jwtIssuer, jwtSecret);

        const options = {
            headers: {
                'Authorization': `JWT ${jwt}`,
                'Accept': 'application/json',
                'User-Agent': 'Rikaitan CI/CD Script',
            },
        };

        const req = https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                // Debug: Log the response status and headers
                console.log(`Response status: ${res.statusCode}`);
                console.log(`Response headers: ${JSON.stringify(res.headers)}`);

                // Handle redirects
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    console.log(`Following redirect to: ${res.headers.location}`);
                    makeAuthenticatedRequest(res.headers.location, jwtIssuer, jwtSecret)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                // Debug: Log the raw response data
                console.log(`Raw response data: ${data}`);

                // Check if the response is successful
                if (!res.statusCode || res.statusCode !== 200) {
                    if (res.statusCode === 404) {
                        reject(new Error(`Version not found. Please check if the version exists and is accessible. Response: ${data}`));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                    return;
                }

                // Check if the response data is empty
                if (!data) {
                    reject(new Error('Empty response from server'));
                    return;
                }

                try {
                    const jsonData: SerializableObject = parseJson(data);
                    resolve(jsonData);
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(`${e}`);
                    reject(new Error(`Failed to parse JSON response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });
    });
}

/**
 * Downloads a file from a URL
 * @param url File URL
 * @param filePath Path where to save the file
 * @param jwtIssuer JWT issuer (API key)
 * @param jwtSecret JWT secret (API secret)
 * @returns Promise that resolves when download is complete
 */
function downloadFile(url: string, filePath: string, jwtIssuer: string, jwtSecret: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
        console.log(`Created directory: ${dir}`);
    }
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);

        const jwt = createJWT(jwtIssuer, jwtSecret);

        const options = {
            headers: {
                'Authorization': `JWT ${jwt}`,
                'User-Agent': 'Rikaitan CI/CD Script',
            },
        };

        const req = https.get(url, options, (response) => {
            // Handle redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`Following redirect to: ${response.headers.location}`);
                downloadFile(response.headers.location, filePath, jwtIssuer, jwtSecret)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // Check if the response is successful
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: Failed to download file`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });

            file.on('error', (error) => {
                fs.unlink(filePath, () => {}); // Delete partial file
                reject(error);
            });
        });

        req.on('error', (error) => {
            fs.unlink(filePath, () => {}); // Delete partial file
            reject(error);
        });
    });
}

/**
 * Finds the latest approved self-hosted version of an extension
 * @param extensionId Extension ID
 * @param jwtIssuer JWT issuer (API key)
 * @param jwtSecret JWT secret (API secret)
 * @param addonVersion Addon version to download.
 * @returns Latest version information
 */
async function findFileByAddonVersion(extensionId: string, jwtIssuer: string, jwtSecret: string, addonVersion: string): Promise<AddonVersion['file']> {
    // https://mozilla.github.io/addons-server/topics/api/addons.html#version-detail-object
    const url = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(addonVersion)}/`;
    console.log(`Making request to: ${url}`);
    const data = await makeAuthenticatedRequest(url, jwtIssuer, jwtSecret) as AddonVersion;

    if (data.channel !== 'unlisted') {
        throw new Error('This version is not self-hosted.');
    }

    if (data.is_disabled) {
        throw new Error('This version has been disabled.');
    }

    const file = data.file;

    if (file.status !== 'public') {
        throw new Error('Latest version is not approved');
    }

    return file;
}

/**
 * Convert github ref to self-hosted addon version.
 * @param githubRef
 * @returns Self-hosted addon version
 */
function githubRefToSelfhostedAddonVersion(githubRef: string): string {
    const versionParts = githubRef.split('.');
    const patchVer = Number.parseInt(versionParts[versionParts.length - 1], 10) + 1;
    return `${versionParts.slice(0, -1).join('.')}.${patchVer}`;
}

/**
 * Main function
 */
async function main(): Promise<void> {
    // Get environment variables
    const extensionId = process.env.extensionId;
    const xpiFilePath = process.env.xpiFilePath;
    const jwtIssuer = process.env.jwtIssuer;
    const jwtSecret = process.env.jwtSecret;
    const githubRef = process.env.githubRef;

    // Validate required environment variables
    if (!extensionId) {
        console.error('Error: extensionId environment variable is required');
        process.exit(1);
    }

    if (!xpiFilePath) {
        console.error('Error: xpiFilePath environment variable is required');
        process.exit(1);
    }

    if (!jwtIssuer) {
        console.error('Error: jwtIssuer environment variable is required');
        process.exit(1);
    }

    if (!jwtSecret) {
        console.error('Error: jwtSecret environment variable is required');
        process.exit(1);
    }

    if (!githubRef) {
        console.error('Error: githubRef environment variable is required');
        process.exit(1);
    }

    const addonVersion = githubRefToSelfhostedAddonVersion(githubRef);
    console.log(`GitHub Ref: ${githubRef}`);
    console.log(`Selfhosted Addon version: ${addonVersion}`);

    try {
        console.log(`Finding latest approved version for extension: ${extensionId}`);
        const file = await findFileByAddonVersion(extensionId, jwtIssuer, jwtSecret, addonVersion);

        console.log(`Found version ${addonVersion}`);

        const fileUrl = file.url;
        console.log(`Downloading from: ${fileUrl}`);

        console.log(`Saving to: ${xpiFilePath}`);
        await downloadFile(fileUrl, xpiFilePath, jwtIssuer, jwtSecret);

        console.log('Download completed successfully.');
    } catch (e) {
        const error = e instanceof Error ? e : new Error(`${e}`);
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
