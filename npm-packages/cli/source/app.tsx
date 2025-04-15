import React, {useEffect, useState} from 'react';
import {Result} from 'meow';
import Login from './components/commands/login.js';
import {Flags} from './lib/cli-flags.js';
import Publish from './components/commands/publish.js';
import Help from './components/commands/help.js';
import Chat from './components/commands/chat.js';
import Logout from './components/commands/logout.js';
import Create from './components/commands/create.js';

export default function App({cli}: {cli: Result<Flags>}) {
	const [command, setCommand] = useState<string | undefined>(undefined);

	useEffect(() => {
		const cmd = cli.input[0] ?? 'help';
		setCommand(cmd);
	}, [cli.input]);

	return (
		<>
			{command === 'help' && <Help cli={cli} />}
			{command === 'chat' && <Chat cli={cli} />}
			{command === 'login' && <Login cli={cli} />}
			{command === 'logout' && <Logout cli={cli} />}
			{command === 'publish' && <Publish cli={cli} />}
			{command === 'create' && <Create cli={cli} />}
		</>
	);
}
