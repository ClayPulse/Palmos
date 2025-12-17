import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {useEffect} from 'react';
import {execa} from 'execa';
import fs from 'fs';
import {cleanDist} from '../../lib/execa-utils/clean.js';
import {webpackCompile} from '../../lib/webpack/compile.js';

export default function Build({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function buildProd() {
			const buildTarget = cli.flags.target as 'client' | 'server' | undefined;

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

				// Create node_modules/.pulse/server directory
				if (!fs.existsSync('node_modules/.pulse/server')) {
					if (process.platform === 'win32') {
						await execa('mkdir node_modules\\.pulse\\server', {
							shell: true,
						});
					} else {
						await execa('mkdir -p node_modules/.pulse/server', {
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

			try {
				await webpackCompile('production', buildTarget);
			} catch (err) {
				console.error('❌ Webpack build failed', err);
			}
		}

		buildProd();
	}, []);

	return <></>;
}
