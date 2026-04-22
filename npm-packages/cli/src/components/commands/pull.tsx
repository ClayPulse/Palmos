import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import {pullApp} from '../../lib/backend/pull-app.js';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export default function Pull({cli}: {cli: Result<Flags>}) {
	const [error, setError] = useState<string | undefined>();
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isPulling, setIsPulling] = useState(false);
	const [isDone, setIsDone] = useState(false);
	const [outputPath, setOutputPath] = useState('');

	const appName = cli.input[2];
	const version = cli.flags.version as string | undefined;
	const destPath = (cli.flags.path as string) || `./${appName}`;
	const verboseLevel = (cli.flags.logLevel ?? 'normal') as string;
	const isMinimal = verboseLevel === 'minimal';

	useEffect(() => {
		if (error || isDone) {
			const timer = setTimeout(() => process.exit(error ? 1 : 0), 0);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [error, isDone]);

	useEffect(() => {
		if (!appName) {
			setError('Missing app name. Usage: pulse app pull <app-name> [--path ./dest] [--version 1.0.0]');
			return;
		}

		async function checkAuth() {
			const token = getToken(cli.flags.stage);
			if (token) {
				const isValid = await checkToken(token, cli.flags.stage, cli.flags.stageServer);
				if (isValid) {
					setIsAuthenticated(true);
					setIsCheckingAuth(false);
					return;
				}
			}
			setIsCheckingAuth(false);
			setError('Not authenticated. Run `pulse login` first.');
		}

		checkAuth();
	}, []);

	useEffect(() => {
		if (!isAuthenticated) return;

		async function doPull() {
			setIsPulling(true);

			const res = await pullApp(appName!, version, cli.flags.stage, cli.flags.stageServer);

			if (res.status === 403) {
				setError('Forbidden: you do not own this app.');
				return;
			}
			if (res.status === 404) {
				setError('Source code not found for this app/version.');
				return;
			}
			if (!res.ok) {
				const msg = await res.text();
				setError(`Failed to pull app: ${msg}`);
				return;
			}

			const {url} = await res.json();

			const zipRes = await fetch(url);
			if (!zipRes.ok) {
				setError('Failed to download source archive.');
				return;
			}

			const buffer = await zipRes.arrayBuffer();
			const zip = await JSZip.loadAsync(buffer);
			const resolved = path.resolve(destPath);
			setOutputPath(resolved);

			for (const [filePath, entry] of Object.entries(zip.files)) {
				const fullPath = path.join(resolved, filePath);
				if (entry.dir) {
					fs.mkdirSync(fullPath, {recursive: true});
				} else {
					fs.mkdirSync(path.dirname(fullPath), {recursive: true});
					const content = await entry.async('nodebuffer');
					fs.writeFileSync(fullPath, content);
				}
			}

			setIsPulling(false);
			setIsDone(true);
		}

		doPull().catch(err => {
			setError(err?.message || String(err));
		});
	}, [isAuthenticated]);

	if (error) {
		return <Text color="redBright">{"⛔"} {error}</Text>;
	}

	if (isCheckingAuth && !isMinimal) {
		return (
			<Box>
				<Spinner type="dots" />
				<Text> Checking authentication...</Text>
			</Box>
		);
	}

	if (isPulling && !isMinimal) {
		return (
			<Box>
				<Spinner type="dots" />
				<Text> Pulling {appName}...</Text>
			</Box>
		);
	}

	if (isDone) {
		return <Text color="greenBright">{"✅"} Pulled {appName} to {outputPath}</Text>;
	}

	return null;
}
