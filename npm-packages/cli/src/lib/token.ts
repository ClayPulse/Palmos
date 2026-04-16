import os from 'os';
import path from 'path';
import fs from 'fs';
import {getBackendUrl} from './backend-url.js';

export function saveToken(token: string | undefined, devMode: boolean) {
	// Save the token to .pulse-editor/config.json in user home directory
	const configDir = path.join(os.homedir(), '.pulse-editor');
	const configFile = path.join(configDir, 'config.json');

	const hasConfig = fs.existsSync(configFile);
	const existingConfig = hasConfig
		? JSON.parse(fs.readFileSync(configFile, 'utf8'))
		: {};

	const newConfig = devMode
		? {
				...existingConfig,
				devAccessToken: token,
			}
		: {
				...existingConfig,
				accessToken: token,
			};
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, {recursive: true});
	}
	fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2));
}

export function getToken(devMode: boolean) {
	// First try to get the token from the environment variable
	const tokenEnv = devMode
		? process.env['PE_DEV_ACCESS_TOKEN']
		: process.env['PALMOS_API_KEY'];
	if (tokenEnv) {
		return tokenEnv;
	}

	// If not found, try to get the token from the config file
	const configDir = path.join(os.homedir(), '.pulse-editor');
	const configFile = path.join(configDir, 'config.json');
	if (fs.existsSync(configFile)) {
		try {
			const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

			const token = devMode ? config.devAccessToken : config.accessToken;

			if (token) {
				return token as string;
			}
		} catch (error) {
			console.error('Failed to parse config.json:', error);
			// Return undefined if JSON parsing fails
			return undefined;
		}
	}

	// If not found, return undefined
	return undefined;
}

export function isTokenInEnv(devMode: boolean) {
	// Check if the token is set in the environment variable
	const tokenEnv = devMode
		? process.env['PE_DEV_ACCESS_TOKEN']
		: process.env['PALMOS_API_KEY'];
	if (tokenEnv) {
		return true;
	}
	return false;
}

export async function checkToken(
	token: string,
	devMode: boolean,
	stageServer?: string,
) {
	const res = await fetch(
		`${getBackendUrl(devMode, stageServer)}/api/api-keys/check`,
		{
			body: JSON.stringify({token}),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal: AbortSignal.timeout(15000),
		},
	);

	if (res.status === 200) {
		return true;
	} else {
		return false;
	}
}
