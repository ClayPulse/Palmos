import os from 'os';
import path from 'path';
import fs from 'fs';

export function saveToken(token: string | undefined) {
	// Save the token to .pulse-editor/config.json in user home directory
	const configDir = path.join(os.homedir(), '.pulse-editor');
	const configFile = path.join(configDir, 'config.json');
	const config = {
		accessToken: token,
	};
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, {recursive: true});
	}
	fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

export function getToken() {
	// First try to get the token from the environment variable
	const tokenEnv = process.env['PE_ACCESS_TOKEN'];
	if (tokenEnv) {
		return tokenEnv;
	}

	// If not found, try to get the token from the config file
	const configDir = path.join(os.homedir(), '.pulse-editor');
	const configFile = path.join(configDir, 'config.json');
	if (fs.existsSync(configFile)) {
		try {
			const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
			if (config.accessToken) {
				return config.accessToken as string;
			}
		} catch (error) {
			console.error('Failed to parse config.json:', error);
			// Return undefined if JSON parsing fails
			return undefined;
	}

	// If not found, return undefined
	return undefined;
}

export function isTokenInEnv() {
	// Check if the token is set in the environment variable
	const tokenEnv = process.env['PE_ACCESS_TOKEN'];
	if (tokenEnv) {
		return true;
	}
	return false;
}

export async function checkToken(token: string) {
	const res = await fetch('https://pulse-editor.com/api/api-keys/check', {
		body: JSON.stringify({token}),
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});

	if (res.status === 200) {
		return true;
	} else {
		return false;
	}
}
