import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {useEffect} from 'react';
import {execa} from 'execa';
import {getDepsBinPath} from '../../lib/execa-utils/deps.js';
import {cleanDist} from '../../lib/execa-utils/clean.js';
import {webpackCompile} from '../../lib/webpack/compile.js';
import {stageServerRuntime} from '../../lib/stage-server.js';
import {resolveCliDist} from '../../lib/resolve-cli-root.js';

export default function Dev({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function startDevServer() {
			await stageServerRuntime();

			// Start dev server
			await cleanDist();

			// Start webpack in dev watch mode and watch for changes
			const compiler = await webpackCompile('development', undefined, true);

			// Start server with tsx
			await execa(
				getDepsBinPath('tsx'),
				[
					'watch',
					'--clear-screen=false',
					resolveCliDist('lib/server/express.js'),
				],
				{
					stdio: 'inherit',
					shell: true,
					env: {
						NODE_OPTIONS: '--import=tsx',
						NODE_ENV: 'development',
					},
				},
			);

			// Handle process exit to close webpack compiler
			process.on('SIGINT', () => {
				if (compiler && typeof compiler.close === 'function') {
					compiler.close(() => {
						process.exit();
					});
				} else {
					process.exit();
				}
			});
		}

		console.log('🚀 Starting development server...');
		startDevServer();
	}, []);

	return <></>;
}
