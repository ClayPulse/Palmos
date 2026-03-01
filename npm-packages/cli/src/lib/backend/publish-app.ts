import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';
import fs from 'fs';

export async function publishApp(isStage: boolean) {
	// Upload the zip file to the server
	// Read pulse.config.json for visibility
	const config = JSON.parse(
		fs.readFileSync('./dist/pulse.config.json', 'utf-8'),
	);

	const visibility = config.visibility as string;
	const formData = new FormData();
	const buffer = fs.readFileSync('./node_modules/@pulse-editor/dist.zip');
	// @ts-ignore Create a Blob from the buffer
	const blob = new Blob([buffer], {
		type: 'application/zip',
	});
	formData.append('file', blob, 'dist.zip');
	formData.append('visibility', visibility);

	// Send the file to the server
	const res = await fetch(
		`${getBackendUrl(isStage)}/api/app/publish`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${getToken(isStage)}`,
			},
			body: formData,
		},
	);

	return res;
}
