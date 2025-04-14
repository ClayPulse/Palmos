import React from 'react';
import {Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';

export default function Publish({cli}: {cli: Result<Flags>}) {
	return (
		<Text>
			Publish Pulse Editor Extension in current directory to the Pulse Editor
			Platform
		</Text>
	);
}
