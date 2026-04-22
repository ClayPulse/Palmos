import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import {listApps} from '../../lib/backend/list-apps.js';

interface AppEntry {
	extensionId: string;
	version: string;
	visibility: string;
	createdAt: string;
	author: {name: string} | null;
	org: {name: string} | null;
}

export default function AppList({cli}: {cli: Result<Flags>}) {
	const [error, setError] = useState<string | undefined>();
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [apps, setApps] = useState<AppEntry[]>([]);
	const [isDone, setIsDone] = useState(false);

	const verboseLevel = (cli.flags.logLevel ?? 'normal') as string;
	const isMinimal = verboseLevel === 'minimal';

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => process.exit(1), 0);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [error]);

	useEffect(() => {
		if (isDone) {
			const timer = setTimeout(() => process.exit(0), 0);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [isDone]);

	useEffect(() => {
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

		async function doList() {
			setIsLoading(true);

			const res = await listApps(cli.flags.stage, cli.flags.stageServer);

			if (!res.ok) {
				const msg = await res.text();
				setError(`Failed to list apps: ${msg}`);
				return;
			}

			const data = await res.json();
			setApps(data);
			setIsLoading(false);
			setIsDone(true);
		}

		doList().catch(err => {
			setError(err?.message || String(err));
		});
	}, [isAuthenticated]);

	if (error) {
		return <Text color="redBright">{"⛔"} {error}</Text>;
	}

	if ((isCheckingAuth || isLoading) && !isMinimal) {
		return (
			<Box>
				<Spinner type="dots" />
				<Text> {isCheckingAuth ? 'Checking authentication...' : 'Fetching apps...'}</Text>
			</Box>
		);
	}

	if (isDone) {
		if (apps.length === 0) {
			return <Text>No published apps found.</Text>;
		}

		return (
			<Box flexDirection="column">
				<Text bold>Your published apps:</Text>
				<Text> </Text>
				{apps.map((app, i) => (
					<Box key={`${app.extensionId}-${app.version}`} flexDirection="column">
						<Text bold>{app.extensionId}</Text>
						<Text>v{app.version} ({app.visibility})</Text>
						{i < apps.length - 1 && <Text> </Text>}
					</Box>
				))}
			</Box>
		);
	}

	return null;
}
