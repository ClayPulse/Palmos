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

export default function Preview({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function startPreviewServer() {
			await stageServerRuntime();

			// Start preview server
			await cleanDist();
			// await execa(
			// 	getDepsBinPath('concurrently'),
			// 	[
			// 		'--prefix',
			// 		'none',
			// 		'"npx webpack --mode development --watch"',
			// 		`"tsx watch --clear-screen=false ${resolveCliDist('lib/server/express.js')}"`,
			// 	],
			// 	{
			// 		stdio: 'inherit',
			// 		shell: true,
			// 		env: {
			// 			NODE_OPTIONS: '--import=tsx',
			// 			PREVIEW: 'true',
			// 		},
			// 	},
			// );

			const compiler = await webpackCompile('preview', undefined, true);

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
						PREVIEW: 'true',
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

		console.log('🚀 Starting preview server...');
		startPreviewServer();
	}, []);

	return <></>;
}
