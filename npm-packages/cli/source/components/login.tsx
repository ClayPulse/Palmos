import React, {useEffect, useState} from 'react';
import {Box, Newline, Text, useApp} from 'ink';
import SelectInput from 'ink-select-input';
import {Flags} from '../flags.js';
import {Result} from 'meow';
import TextInput, {UncontrolledTextInput} from 'ink-text-input';
import Spinner from 'ink-spinner';
import os from 'os';
import path from 'path';
import fs from 'fs';

type Item<V> = {
	key?: string;
	label: string;
	value: V;
};

export default function Login({cli}: {cli: Result<Flags>}) {
	const [loginMethod, setLoginMethod] = useState<string | undefined>(undefined);
	const [isShowingSelect, setIsShowingSelect] = useState(false);
	const [isShowingInput, setIsShowingInput] = useState(false);

	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [token, setToken] = useState<string>('');

	const [isTokenInEnv, setIsTokenInEnv] = useState(false);
	const [isTokenSaved, setIsTokenSaved] = useState(false);

	const [tokenInput, setTokenInput] = useState<string>('');
	const [saveTokenInput, setSaveTokenInput] = useState<string>('');

	const loginMethodItems: Item<string>[] = [
		{
			label: 'Login using access token',
			value: 'token',
		},
		{
			label: '(WIP) Login in browser',
			value: 'flow',
		},
	];

	const {exit} = useApp();

	// Check login method
	useEffect(() => {
		const savedToken = getToken();
		if (savedToken) {
			setLoginMethod('token');
			setToken(savedToken);
			return;
		} else if (cli.flags.token) {
			setLoginMethod('token');
		} else if (cli.flags.flow) {
			setLoginMethod('flow');
		}
	}, [cli]);

	useEffect(() => {
		setIsShowingSelect(loginMethod === undefined);
	}, [loginMethod]);

	useEffect(() => {
		setIsShowingInput(!isShowingSelect);
	}, [isShowingSelect]);

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
			checkToken(token).then(isValid => {
				setIsAuthenticated(isValid);
				setIsCheckingAuth(false);
			});
		}
	}, [token, loginMethod]);

	function saveToken(token: string) {
		// Save the token to .pulse-editor/config.json in user home directory
		const configDir = path.join(os.homedir(), '.pulse-editor');
		const configFile = path.join(configDir, 'config.json');
		const config = {
			accessToken: token,
		};
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, {recursive: true});
		}
		fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
	}

	function getToken() {
		// First try to get the token from the environment variable
		const tokenEnv = process.env['PE_ACCESS_TOKEN'];
		if (tokenEnv) {
			setIsTokenInEnv(true);
			return tokenEnv;
		}

		// If not found, try to get the token from the config file
		const configDir = path.join(os.homedir(), '.pulse-editor');
		const configFile = path.join(configDir, 'config.json');
		if (fs.existsSync(configFile)) {
			const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
			if (config.accessToken) {
				return config.accessToken as string;
			}
		}

		// If not found, return undefined
		return undefined;
	}

	return (
		<>
			{isShowingSelect && (
				<>
					<Text>Login to the Pulse Editor Platform</Text>
					<SelectInput
						items={loginMethodItems}
						onSelect={item => {
							setLoginMethod(item.value);
						}}
					/>
				</>
			)}

			{isShowingInput &&
				loginMethod === 'token' &&
				(token.length === 0 ? (
					<>
						<Text>Enter your Pulse Editor access token:</Text>
						<TextInput
							mask="*"
							value={tokenInput}
							onChange={setTokenInput}
							onSubmit={value => {
								if (value.length === 0) {
									return;
								}
								setToken(value);
							}}
						/>
					</>
				) : isCheckingAuth ? (
					<Box>
						<Spinner type="dots" />
						<Text> Checking authentication...</Text>
					</Box>
				) : isAuthenticated ? (
					<>
						<Text>✅ You are signed in successfully.</Text>
						{!isTokenInEnv && getToken() !== token && (
							<>
								<Text>
									🟢 It is recommended to save your access token as an
									environment variable PE_ACCESS_TOKEN.
								</Text>
								<Box>
									<Text>
										⚠️ (NOT recommended) Or, do you want to save access token to
										user home directory? (y/n){' '}
									</Text>
									<TextInput
										value={saveTokenInput}
										onChange={setSaveTokenInput}
										onSubmit={value => {
											if (value.length === 0) {
												return;
											}
											if (value === 'y') {
												saveToken(token);
												setIsTokenSaved(true);
												setTimeout(() => {
													exit();
												}, 100);
											} else {
												exit();
											}
										}}
									/>
								</Box>
							</>
						)}
						{isTokenSaved && (
							<Text>
								Token saved to {path.join(os.homedir(), '.pulse-editor')}
							</Text>
						)}
					</>
				) : (
					<Text>Authentication error: please enter valid credentials.</Text>
				))}
			{isShowingInput && loginMethod === 'flow' && (
				<>
					<Text>(WIP) Open the following URL in your browser:</Text>
					<Text>https://pulse-editor.com/login</Text>
				</>
			)}
		</>
	);
}
