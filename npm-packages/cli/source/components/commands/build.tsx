import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {useEffect} from 'react';
import {execa} from 'execa';
import fs from 'fs';
import {cleanDist} from '../../lib/execa-utils/clean.js';

export default function Build({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function buildProd() {
			const buildTarget: string | undefined = cli.flags.target;
			console.log(
				`🚧 Building for target: ${buildTarget || 'both client and server'}`,
			);

			// Move node_modules/@pulse-editor/cli/dist/lib/server to node_modules/.pulse/server
			if (buildTarget === 'server' || !buildTarget) {
				if (fs.existsSync('node_modules/.pulse/server')) {
					// Remove existing directory
					if (process.platform === 'win32') {
						await execa('rmdir /S /Q node_modules\\.pulse\\server', {
							shell: true,
						});
					} else {
						await execa('rm -rf node_modules/.pulse/server', {
							shell: true,
						});
					}
				}

				if (process.platform === 'win32') {
					await execa(
						'xcopy /E /I node_modules\\@pulse-editor\\cli\\dist\\lib\\server node_modules\\.pulse\\server',
						{
							shell: true,
						},
					);
				} else {
					await execa(
						'cp -r node_modules/@pulse-editor/cli/dist/lib/server/* node_modules/.pulse/server/',
						{
							shell: true,
						},
					);
				}
			}

			await cleanDist();
			if (buildTarget === undefined) {
				// Start building
				await execa('npx webpack --mode production', {
					stdio: 'inherit',
					shell: true,
					env: {
						NODE_OPTIONS: '--import=tsx',
					},
				});
			} else if (buildTarget === 'client') {
				// Start building client only
				await execa('npx webpack --mode production', {
					stdio: 'inherit',
					shell: true,
					env: {
						NODE_OPTIONS: '--import=tsx',
						BUILD_TARGET: 'client',
					},
				});
			} else if (buildTarget === 'server') {
				// Start building server only
				await execa('npx webpack --mode production', {
					stdio: 'inherit',
					shell: true,
					env: {
						NODE_OPTIONS: '--import=tsx',
						BUILD_TARGET: 'server',
					},
				});
			} else {
				console.error(`❌ Unknown build target: ${buildTarget}`);
			}
		}

		buildProd();
	}, []);

	return <></>;
}
