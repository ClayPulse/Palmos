import {execa} from 'execa';

async function main() {
	// Run the build command
	await execa('tsc', {
		stdio: 'inherit',
		shell: true,
	});

	// Copy preview html file to dist
	if (process.platform === 'linux') {
		await execa(
			'cp',
			[
				'source/lib/server/preview/frontend/index.html',
				'dist/lib/server/preview/frontend/index.html',
			],
			{
				stdio: 'inherit',
				shell: true,
			},
		);
	} else if (process.platform === 'win32') {
		await execa(
			'copy',
			[
				'source\\lib\\server\\preview\\frontend\\index.html',
				'dist\\lib\\server\\preview\\frontend\\index.html',
			],
			{
				stdio: 'inherit',
				shell: true,
			},
		);
	}
}

main();
