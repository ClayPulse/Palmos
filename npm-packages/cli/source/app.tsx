import React, {useEffect, useState} from 'react';
import {Text} from 'ink';
import {Result} from 'meow';
import {commandsManual} from './manual.js';
import Login from './components/login.js';
import {Flags} from './flags.js';

export default function App({cli}: {cli: Result<Flags>}) {
	const [command, setCommand] = useState<string | undefined>(undefined);

	useEffect(() => {
		const cmd = cli.input[0] ?? 'help';
		setCommand(cmd);
	}, [cli.input]);

	if (!command) return null;
	else if (command === 'help') {
		const subCommand = cli.input[1];
		if (!subCommand) {
			return <Text>{cli.help}</Text>;
		} else {
			return <Text>{commandsManual[subCommand]}</Text>;
		}
	} else if (command === 'chat') {
		const message = cli.input[1];
		return (
			<>
				<Text>
					Hello, <Text color="green">{message}</Text>
				</Text>
			</>
		);
	} else if (command === 'login') {
		return <Login cli={cli} />;
	} else if (command === 'logout') {
		return <Text>Logout from the Pulse Editor Platform</Text>;
	} else if (command === 'publish') {
		return (
			<Text>
				Publish Pulse Editor Extension in current directory to the Pulse Editor
				Platform
			</Text>
		);
	}

	return <Text>{cli.help}</Text>;
}
