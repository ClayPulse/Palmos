import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';

export default function Dev({cli}: {cli: Result<Flags>}) {
	const message = cli.input[1];
	return (
		<>
			<Text>
				Hello, <Text color="green">{message}</Text>
			</Text>
		</>
	);
}
