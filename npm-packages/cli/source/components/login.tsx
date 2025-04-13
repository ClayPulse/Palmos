import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
// import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import {Flags} from '../flags.js';
import {Result} from 'meow';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';

type Item<V> = {
	key?: string;
	label: string;
	value: V;
};

type LoginMethod = 'token' | 'flow';

export default function Login({cli}: {cli: Result<Flags>}) {
	const [isCheckingAuth, setIsCheckingAuth] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loginMethod, setLoginMethod] = useState<LoginMethod | undefined>(
		undefined,
	);
	const [token, setToken] = useState<string>('');

	const items: Item<LoginMethod>[] = [
		{
			label: 'Login using access token',
			value: 'token',
		},
		{
			label: '(WIP) Login in browser',
			value: 'flow',
		},
	];

	// Check login method
	useEffect(() => {
		const tokenEnv = process.env['PE_ACCESS_TOKEN'];
		if (tokenEnv) {
			setLoginMethod('token');
			setToken(tokenEnv);
		}

		if (cli.flags.token) {
			setLoginMethod('token');
		} else if (cli.flags.flow) {
			setLoginMethod('flow');
		}
	}, [cli]);

	// Check token validity
	useEffect(() => {
		async function checkToken(token: string) {
			const res = await fetch('https://pulse-editor.com/api/api-keys/check', {
				body: JSON.stringify({token}),
				headers: {
					'Content-Type': 'application/json',
				},
				method: 'POST',
			});

			if (res.status === 200) {
				return true;
			} else {
				return false;
			}
		}

		// Only check token validity when it is set
		if (loginMethod === 'token' && token.length > 0) {
			setIsCheckingAuth(true);
			checkToken(token).then(isValid => {
				setIsAuthenticated(isValid);
				setIsCheckingAuth(false);
			});
		}
	}, [token, loginMethod]);

	if (loginMethod === undefined) {
		// Prompt user to select login method
		return (
			<>
				<Text>Login to the Pulse Editor Platform</Text>
				<SelectInput
					items={items}
					onSelect={item => setLoginMethod(item.value)}
				/>
			</>
		);
	} else if (loginMethod === 'token') {
		// Prompt user to enter token if not already set
		if (token.length === 0) {
			return (
				<>
					<Text>Enter your Pulse Editor access token:</Text>
					<TextInput
						value={token}
						onChange={setToken}
						onSubmit={value => setToken(value)}
					/>
				</>
			);
		}

		// Check token validity
		if (isCheckingAuth) {
			return (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			);
		}

		if (isAuthenticated) {
			return <Text>You are signed in successfully.</Text>;
		}
		return <Text>Authentication error: please enter valid credentials.</Text>;
	}

	return (
		<>
			<Text>(WIP) Open the following URL in your browser:</Text>
			<Text>https://pulse-editor.com/login</Text>
		</>
	);
}
