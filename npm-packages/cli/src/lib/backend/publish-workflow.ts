import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';
import fs from 'fs';

export async function publishWorkflow(
	filePath: string,
	options: {
		name?: string;
		visibility?: string;
		description?: string;
		version?: string;
	},
	isStage: boolean,
) {
	const raw = fs.readFileSync(filePath, 'utf-8');

	const body: Record<string, string> = {
		yaml: raw,
	};

	if (options.name) body['name'] = options.name;
	if (options.visibility) body['visibility'] = options.visibility;
	if (options.description) body['description'] = options.description;
	if (options.version) body['version'] = options.version;

	const res = await fetch(
		`${getBackendUrl(isStage)}/api/workflow/publish-yaml`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${getToken(isStage)}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		},
	);

	return res;
}
