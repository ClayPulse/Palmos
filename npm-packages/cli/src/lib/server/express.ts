/**
 *  This is a local dev server for "npm run dev" and "npm run preview".
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import livereload from 'livereload';
import connectLivereload from 'connect-livereload';
import {networkInterfaces} from 'os';
import {pipeline, Readable} from 'stream';
import {promisify} from 'util';
import {readConfigFile} from './utils.js';
import path from 'path';
import {pathToFileURL} from 'url';

dotenv.config({
	quiet: true,
});

const isPreview = process.env?.['PREVIEW'];
const isDev = process.env?.['NODE_ENV'] === 'development';
const workspaceId = process.env?.['WORKSPACE_ID'];

const pulseConfig = await readConfigFile();

if (isDev || isPreview) {
	const livereloadServer = livereload.createServer({
		// @ts-expect-error override server options
		host: '0.0.0.0',
	});
	livereloadServer.watch('dist');
	livereloadServer.server.once('connection', () => {
		console.log('✅ LiveReload connected');
	});
}

const app = express();
app.use(cors());
// Inject the client-side livereload script into HTML responses
app.use(
	// The port might not be right here for the ingress.
	// I need this route to be exposed
	connectLivereload({
		// @ts-expect-error override server options
		host: workspaceId
			? `${workspaceId}.workspace.pulse-editor.com"`
			: undefined,
		port: workspaceId ? 443 : 35729,
	}),
);

app.use(express.json());

// Log each request to the console
app.use((req, res, next) => {
	console.log(`✅ [${req.method}] Received: ${req.url}`);
	return next();
});

// Serve backend
app.use(
	`/${pulseConfig.id}/${pulseConfig.version}/server`,
	express.static('dist/server'),
);
// Catch backend function calls
app.all(/^\/server-function\/(.*)/, async (req, res) => {
	const func = req.params[0];

	const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
	// Convert Express req -> Fetch Request
	const request = new Request(url, {
		method: req.method,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		headers: req.headers as any,
		body: ['GET', 'HEAD'].includes(req.method)
			? null
			: JSON.stringify(req.body),
	});

	const dir = path.resolve(
		'node_modules/@pulse-editor/cli/dist/lib/server/preview/backend/load-remote.cjs',
	);

	const fileUrl = pathToFileURL(dir).href;

	const {loadAndCall} = await import(fileUrl);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response = await loadAndCall(
		func,
		request,
		pulseConfig.id,
		'http://localhost:3030',
		pulseConfig.version,
	);

	const streamPipeline = promisify(pipeline);

	// If loadAndCall returns a Response (Fetch API Response)
	if (response.body) {
		// Convert WHATWG stream to Node.js stream
		const nodeStream = Readable.fromWeb(response.body);
		// Pipe it directly to Express
		await streamPipeline(nodeStream, res);
	} else {
		res.end();
	}
});

if (isPreview) {
	/* Preview mode */
	app.use(express.static('dist/client'));

	app.listen(3030, '0.0.0.0');
} else if (isDev) {
	/* Dev mode  */
	app.use(`/${pulseConfig.id}/${pulseConfig.version}`, express.static('dist'));

	app.listen(3030, '0.0.0.0');
} else {
	/* Production mode */
	app.use(`/${pulseConfig.id}/${pulseConfig.version}`, express.static('dist'));

	app.listen(3030, '0.0.0.0', () => {
		console.log(`\
🎉 Your Pulse extension \x1b[1m${pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030/${pulseConfig.id}/${pulseConfig.version}/
⚡️ Network: http://${getLocalNetworkIP()}:3030/${pulseConfig.id}/${
			pulseConfig.version
		}/

✨ Try it out in the Pulse Editor and let the magic happen! 🚀`);
	});
}

function getLocalNetworkIP() {
	const interfaces = networkInterfaces();
	for (const iface of Object.values(interfaces)) {
		if (!iface) continue;
		for (const config of iface) {
			if (config.family === 'IPv4' && !config.internal) {
				return config.address; // Returns the first non-internal IPv4 address
			}
		}
	}
	return 'localhost'; // Fallback
}
