import os from 'os';
import path from 'path';
import fs from 'fs';

export function saveToken(token: string) {
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
		const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
		if (config.accessToken) {
			return config.accessToken as string;
		}
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
