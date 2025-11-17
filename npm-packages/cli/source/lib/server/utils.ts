import fs from 'fs/promises';

export async function readConfigFile() {
	// Read pulse.config.json from dist/client
	// Wait until dist/client/pulse.config.json exists
	while (true) {
		try {
			await fs.access('dist/client/pulse.config.json');
			break;
		} catch (err) {
			// Wait for 100ms before trying again
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	const data = await fs.readFile('dist/client/pulse.config.json', 'utf-8');
	return JSON.parse(data);
}
