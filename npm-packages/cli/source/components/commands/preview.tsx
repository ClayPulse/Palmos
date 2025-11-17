import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {useEffect} from 'react';
import {execa} from 'execa';
import fs from 'fs';

export default function Preview({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		async function startDevServer() {
			// Move node_modules/@pulse-editor/cli/dist/lib/server to node_modules/.pulse/server
			if (fs.existsSync('node_modules/.pulse/server')) {
        // Remove existing directory
        if (process.platform === 'win32') {
          await execa(
            'rmdir /S /Q node_modules\\.pulse\\server',
            {
              shell: true,
            },
          );
        } else {
          await execa(
            'rm -rf node_modules/.pulse/server',
            {
              shell: true,
            },
          );
        }
      }
      
      await execa('mkdir "node_modules/.pulse/server"', {
        shell: true,
      });

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

			// Start dev server
			await execa(
				'npm run clean && npx cross-env NODE_OPTIONS=\'--import=tsx\' PREVIEW=true concurrently --prefix none "webpack --mode development --watch" "tsx watch --clear-screen=false node_modules/@pulse-editor/cli/dist/lib/server/express.js"',
				{
					stdio: 'inherit',
					shell: true,
				},
			);
		}
		startDevServer();
	}, []);

	return (
		<>
			<Text>Starting preview server...</Text>
		</>
	);
}
