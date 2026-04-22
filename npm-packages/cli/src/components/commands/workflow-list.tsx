import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import {listWorkflows} from '../../lib/backend/list-workflows.js';

interface WorkflowEntry {
	id: string;
	name: string;
	version: string;
	visibility: string;
	description: string | null;
	createdAt: string;
}

export default function WorkflowList({cli}: {cli: Result<Flags>}) {
	const [error, setError] = useState<string | undefined>();
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [workflows, setWorkflows] = useState<WorkflowEntry[]>([]);
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

			const res = await listWorkflows(cli.flags.stage, cli.flags.stageServer);

			if (!res.ok) {
				const msg = await res.text();
				setError(`Failed to list workflows: ${msg}`);
				return;
			}

			const data = await res.json();
			setWorkflows(data);
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
				<Text> {isCheckingAuth ? 'Checking authentication...' : 'Fetching workflows...'}</Text>
			</Box>
		);
	}

	if (isDone) {
		if (workflows.length === 0) {
			return <Text>No published workflows found.</Text>;
		}

		return (
			<Box flexDirection="column">
				<Text bold>Your published workflows:</Text>
				<Text> </Text>
				{workflows.map((wf, i) => (
					<Box key={wf.id} flexDirection="column">
						<Text bold>{wf.name}</Text>
						<Text>v{wf.version} ({wf.visibility})</Text>
						<Box width={80}>
							<Text color="gray" wrap="wrap">
								{wf.description || 'No description'}
							</Text>
						</Box>
						{i < workflows.length - 1 && <Text> </Text>}
					</Box>
				))}
			</Box>
		);
	}

	return null;
}
