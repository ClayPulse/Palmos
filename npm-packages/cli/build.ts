import {execa} from 'execa';

/**
 *	Build the cli executable and copy necessary files to dist
 */
async function main() {
	console.log('🚧 Building the CLI package...');

	// Run the build command
	await execa('tsc', {
		stdio: 'inherit',
		shell: true,
	});

	// Copy files to dist
	const filesToCopy = [
		'lib/server/preview/frontend/index.html',
		'lib/server/preview/backend/load-remote.cjs',
	];

	for (const filePath of filesToCopy) {
		if (process.platform === 'win32') {
			await execa(
				'copy',
				[
					`src\\${filePath.replace(/\//g, '\\')}`,
					`dist\\${filePath.replace(/\//g, '\\')}`,
				],
				{
					shell: true,
				},
			);
		} else {
			await execa('cp', [`src/${filePath}`, `dist/${filePath}`], {
				shell: true,
			});
		}
	}

	console.log('✅ Build completed successfully.');
}

main();
