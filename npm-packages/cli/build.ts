import {execa} from 'execa';
import fs from 'fs';

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
		// Create folder if it doesn't exist
		const pathParts = filePath.split('/');
		pathParts.pop();
		const folderPath = pathParts.join('/');

		if (!fs.existsSync(`dist/${folderPath}`)) {
			fs.mkdirSync(`dist/${folderPath}`, {recursive: true});
		}

		fs.copyFileSync(`src/${filePath}`, `dist/${filePath}`);
	}

	console.log('✅ Build completed successfully.');
}

main();
