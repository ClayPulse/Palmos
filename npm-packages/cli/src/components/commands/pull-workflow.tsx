import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import {pullApp} from '../../lib/backend/pull-app.js';
import {pullWorkflow} from '../../lib/backend/pull-workflow.js';
import {workflowContentToYaml} from '../../lib/workflow-to-yaml.js';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

interface AppPullResult {
	appId: string;
	status: 'pulled' | 'skipped';
	reason?: string;
}

export default function PullWorkflow({cli}: {cli: Result<Flags>}) {
	const [error, setError] = useState<string | undefined>();
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [status, setStatus] = useState('');
	const [appResults, setAppResults] = useState<AppPullResult[]>([]);
	const [isDone, setIsDone] = useState(false);
	const [outputPath, setOutputPath] = useState('');

	const workflowName = cli.input[2];
	const destPath = (cli.flags.path as string) || `./${workflowName}`;
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
		if (!workflowName) {
			setError('Missing workflow name. Usage: pulse workflow pull <workflow-name> [--path ./dest]');
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
			const resolved = path.resolve(destPath);
			setOutputPath(resolved);
			fs.mkdirSync(resolved, {recursive: true});

			// 1. Fetch workflow
			setStatus('Fetching workflow...');
			const wfRes = await pullWorkflow(workflowName!, cli.flags.stage, cli.flags.stageServer);

			if (!wfRes.ok) {
				const msg = await wfRes.text();
				setError(`Failed to pull workflow: ${msg}`);
				return;
			}

			const workflow = await wfRes.json();
			const yamlContent = workflowContentToYaml(workflow);
			fs.writeFileSync(
				path.join(resolved, 'workflow_connections.yaml'),
				yamlContent,
			);

			// 2. Extract unique apps from workflow nodes
			const content = workflow.content as any;
			const nodes: any[] = content?.nodes ?? [];
			const appMap = new Map<string, string>();
			for (const node of nodes) {
				const appId = node?.data?.config?.app;
				const version = node?.data?.config?.requiredVersion;
				if (appId && !appMap.has(appId)) {
					appMap.set(appId, version ?? '');
				}
			}

			// 3. Pull each app's source
			const results: AppPullResult[] = [];
			for (const [appId, version] of appMap) {
				setStatus(`Pulling ${appId}...`);
				try {
					const res = await pullApp(appId, version || undefined, cli.flags.stage, cli.flags.stageServer);

					if (res.status === 403) {
						results.push({appId, status: 'skipped', reason: 'not owned'});
						continue;
					}
					if (res.status === 404) {
						results.push({appId, status: 'skipped', reason: 'no source uploaded'});
						continue;
					}
					if (!res.ok) {
						results.push({appId, status: 'skipped', reason: `error ${res.status}`});
						continue;
					}

					const {url} = await res.json();
					const zipRes = await fetch(url);
					if (!zipRes.ok) {
						results.push({appId, status: 'skipped', reason: 'download failed'});
						continue;
					}

					const buffer = await zipRes.arrayBuffer();
					const zip = await JSZip.loadAsync(buffer);
					const appDir = path.join(resolved, 'apps', appId);
					for (const [filePath, entry] of Object.entries(zip.files)) {
						const fullPath = path.join(appDir, filePath);
						if (entry.dir) {
							fs.mkdirSync(fullPath, {recursive: true});
						} else {
							fs.mkdirSync(path.dirname(fullPath), {recursive: true});
							const fileContent = await entry.async('nodebuffer');
							fs.writeFileSync(fullPath, fileContent);
						}
					}
					results.push({appId, status: 'pulled'});
				} catch (err: any) {
					results.push({appId, status: 'skipped', reason: err?.message || 'unknown error'});
				}
			}

			setAppResults(results);
			setStatus('');
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

	if (status && !isMinimal) {
		return (
			<Box>
				<Spinner type="dots" />
				<Text> {status}</Text>
			</Box>
		);
	}

	if (isDone) {
		return (
			<Box flexDirection="column">
				<Text color="greenBright">{"✅"} Pulled workflow {workflowName} to {outputPath}</Text>
				{appResults.map(r => (
					<Text key={r.appId}>
						{r.status === 'pulled' ? (
							<Text color="green">  {"✓"} {r.appId}</Text>
						) : (
							<Text color="yellow">  {"⏭"} {r.appId} (skipped: {r.reason})</Text>
						)}
					</Text>
				))}
			</Box>
		);
	}

	return null;
}
