import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';

export async function listApps(isStage: boolean, stageServer?: string) {
	const res = await fetch(
		`${getBackendUrl(isStage, stageServer)}/api/app/list?published=true`,
		{
			headers: {
				Authorization: `Bearer ${getToken(isStage)}`,
			},
		},
	);

	return res;
}
