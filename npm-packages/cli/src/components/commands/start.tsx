import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {useEffect} from 'react';
import {execa} from 'execa';

export default function Start({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function startProdServer() {
			// Start prod server
			await execa(
				'tsx node_modules/@pulse-editor/cli/dist/lib/server/express.js',
				{
					stdio: 'inherit',
					shell: true,
					env: {
						NODE_OPTIONS: '--import=tsx',
					},
				},
			);
		}

		startProdServer();
	}, []);

	return (
		<>
			<Text>Starting prod server...</Text>
		</>
	);
}
