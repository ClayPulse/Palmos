import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';

export async function pullWorkflow(
	name: string,
	isStage: boolean,
	stageServer?: string,
) {
	const params = new URLSearchParams({name, latest: 'true'});

	const res = await fetch(
		`${getBackendUrl(isStage, stageServer)}/api/workflow/get?${params}`,
		{
			headers: {
				Authorization: `Bearer ${getToken(isStage)}`,
			},
		},
	);

	return res;
}
