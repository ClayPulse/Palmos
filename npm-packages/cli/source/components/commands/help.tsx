import {Result} from 'meow';
import React from 'react';
import {Flags} from '../../lib/cli-flags.js';
import {Text} from 'ink';
import {commandsManual} from '../../lib/manual.js';
import Header from '../header.js';

export default function Help({cli}: {cli: Result<Flags>}) {
	const subCommand = cli.input[1];

	return (
		<>
			{subCommand ? (
				<Text>{commandsManual[subCommand]}</Text>
			) : (
				<>
					<Header />
					<Text>{cli.help}</Text>
				</>
			)}
		</>
	);
}
