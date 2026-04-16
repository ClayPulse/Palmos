export const DEFAULT_STAGE_SERVER = 'https://localhost:8080';

export function getBackendUrl(stage: boolean, stageServer?: string) {
	if (!stage) return 'https://palmos.ai';
	return stageServer && stageServer.length > 0 ? stageServer : DEFAULT_STAGE_SERVER;
}
