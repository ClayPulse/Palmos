import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';

export async function pullApp(
	appName: string,
	version: string | undefined,
	isStage: boolean,
	stageServer?: string,
) {
	const params = new URLSearchParams({app: appName});
	if (version) {
		params.set('version', version);
	}

	const res = await fetch(
		`${getBackendUrl(isStage, stageServer)}/api/app/source?${params}`,
		{
			headers: {
				Authorization: `Bearer ${getToken(isStage)}`,
			},
		},
	);

	return res;
}
