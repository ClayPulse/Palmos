import React, {useEffect, useState} from 'react';
import {Result} from 'meow';
import {Text} from 'ink';

import Login from './components/commands/login.js';
import {Flags} from './lib/cli-flags.js';
import Publish from './components/commands/publish.js';
import Help from './components/commands/help.js';
import Chat from './components/commands/chat.js';
import Logout from './components/commands/logout.js';
import Create from './components/commands/create.js';
import Dev from './components/commands/dev.js';
import Build from './components/commands/build.js';
import Preview from './components/commands/preview.js';
import Start from './components/commands/start.js';
import Clean from './components/commands/clean.js';

export default function App({cli}: {cli: Result<Flags>}) {
	const [command, setCommand] = useState<string | undefined>(undefined);

	if (cli.flags.stage) {
		process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
	} else {
		process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
	}

	useEffect(() => {
		const cmd = cli.input[0] ?? 'help';
		setCommand(cmd);
	}, [cli.input]);

	return (
		<>
			{cli.flags.stage && (
				<Text color={'yellow'}>⚠️ You are in development mode.</Text>
			)}
			{command === 'help' ? (
				<Help cli={cli} />
			) : command === 'chat' ? (
				<Chat cli={cli} />
			) : command === 'login' ? (
				<Login cli={cli} />
			) : command === 'logout' ? (
				<Logout cli={cli} />
			) : command === 'publish' ? (
				<Publish cli={cli} />
			) : command === 'create' ? (
				<Create cli={cli} />
			) : command === 'dev' ? (
				<Dev cli={cli} />
			) : command === 'build' ? (
				<Build cli={cli} />
			) : command === 'preview' ? (
				<Preview cli={cli} />
			) : command === 'start' ? (
				<Start cli={cli} />
			) : command === 'clean' ? (
				<Clean cli={cli} />
			) : (
				command !== undefined && (
					<>
						<Text color={'redBright'}>Invalid command: {command}</Text>
						<Text>
							Run <Text color={'blueBright'}>pulse help</Text> to see the list
							of available commands.
						</Text>
					</>
				)
			)}
		</>
	);
}
