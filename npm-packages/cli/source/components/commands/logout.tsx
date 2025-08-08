import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {saveToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';

export default function Logout({cli}: {cli: Result<Flags>}) {
	const [isLoggedOut, setIsLoggedOut] = useState(false);

	useEffect(() => {
		saveToken(undefined, cli.flags.dev);
		setIsLoggedOut(true);
	}, []);

	return (
		<>
			{isLoggedOut ? (
				<Text>🚀 Successfully logged out!</Text>
			) : (
				<Box>
					<Spinner type="dots" />
					<Text> Logging out...</Text>
				</Box>
			)}
		</>
	);
}
