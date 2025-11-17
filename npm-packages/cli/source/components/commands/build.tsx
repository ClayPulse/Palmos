import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {useEffect} from 'react';
import {execa} from 'execa';

export default function Build({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		// Start dev server
		execa('npm run build', {
			stdio: 'inherit',
			shell: true,
		});
	}, []);

	return (
		<>
			<Text>Building...</Text>
		</>
	);
}
