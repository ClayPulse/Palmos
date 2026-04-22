import {getToken} from '../token.js';
import {getBackendUrl} from '../backend-url.js';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {glob} from 'glob';

const IGNORE_PATTERNS = [
	'node_modules/**',
	'dist/**',
	'.git/**',
	'.next/**',
	'.cache/**',
	'*.zip',
];

export async function uploadSource(isStage: boolean, stageServer?: string) {
	const config = JSON.parse(
		fs.readFileSync('./dist/pulse.config.json', 'utf-8'),
	);
	const appId = config.appId as string;
	const version = config.version as string;

	if (!appId || !version) {
		throw new Error('Missing appId or version in pulse.config.json');
	}

	// Zip project source
	const zip = new JSZip();
	const files = await glob('**/*', {
		dot: true,
		nodir: true,
		ignore: IGNORE_PATTERNS,
	});

	for (const file of files) {
		const content = fs.readFileSync(file);
		zip.file(file, content);
	}

	const zipBuffer = await zip.generateAsync({type: 'nodebuffer'});

	// Request presigned URL
	const backend = getBackendUrl(isStage, stageServer);
	const token = getToken(isStage);

	const presignedRes = await fetch(
		`${backend}/api/app/publish/request-presigned`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({type: 'source', appId, version}),
		},
	);

	if (presignedRes.status === 409) {
		// Source already exists for this version, skip silently
		return;
	}

	if (!presignedRes.ok) {
		const msg = await presignedRes.text();
		throw new Error(`Failed to get presigned URL for source: ${msg}`);
	}

	const {url} = await presignedRes.json();

	// Upload zip to presigned URL
	const uploadRes = await fetch(url, {
		method: 'PUT',
		headers: {
			'x-ms-blob-type': 'BlockBlob',
			'Content-Type': 'application/zip',
		},
		body: new Uint8Array(zipBuffer),
	});

	if (!uploadRes.ok) {
		throw new Error(`Failed to upload source: ${uploadRes.statusText}`);
	}
}
