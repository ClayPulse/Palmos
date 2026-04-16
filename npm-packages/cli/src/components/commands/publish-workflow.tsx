import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import fs from 'fs';
import path from 'path';
import {publishWorkflow} from '../../lib/backend/publish-workflow.js';

export default function PublishWorkflow({cli}: {cli: Result<Flags>}) {
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isPublished, setIsPublished] = useState(false);
	const [publishedId, setPublishedId] = useState<string | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(
		undefined,
	);

	const verboseLevel = (cli.flags.logLevel ?? 'normal') as string;
	const isSilent = verboseLevel === 'silent';
	const isMinimal = verboseLevel === 'minimal';
	const filePath = cli.input[1];

	// Validate file path
	const fileError = !filePath
		? 'Please provide a path to a .yaml or .yml file.\n  Usage: pulse publish-workflow <path-to-file.yaml>'
		: !fs.existsSync(filePath)
			? `File not found: ${filePath}`
			: !['.yaml', '.yml'].includes(path.extname(filePath).toLowerCase())
				? 'File must be a .yaml or .yml file.'
				: undefined;

	// Exit on terminal failure
	useEffect(() => {
		if (
			fileError ||
			(!isCheckingAuth && !isAuthenticated) ||
			errorMessage
		) {
			const timer = setTimeout(() => process.exit(1), 0);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [fileError, isCheckingAuth, isAuthenticated, errorMessage]);

	// Check auth
	useEffect(() => {
		async function checkAuth() {
			const token = getToken(cli.flags.stage);
			if (token) {
				const isValid = await checkToken(
					token,
					cli.flags.stage,
					cli.flags.stageServer,
				);
				if (isValid) {
					setIsAuthenticated(true);
				}
			}
			setIsCheckingAuth(false);
		}

		if (!fileError) {
			checkAuth();
		}
	}, [fileError]);

	// Publish
	useEffect(() => {
		async function doPublish() {
			setIsPublishing(true);
			try {
				const res = await publishWorkflow(
					filePath!,
					{
						name: cli.flags.name,
						visibility: cli.flags.visibility,
						description: cli.flags.description,
					},
					cli.flags.stage,
					cli.flags.stageServer,
				);

				if (res.status === 200) {
					const body = await res.json();
					const id = body.id || body.workflowId;
					setPublishedId(id);
					setIsPublished(true);
				} else {
					const body = await res.json();
					setErrorMessage(
						body.error || 'Unknown error occurred while publishing.',
					);
				}
			} catch (error: any) {
				setErrorMessage(error?.message || String(error));
			} finally {
				setIsPublishing(false);
			}
		}

		if (isAuthenticated) {
			doPublish();
		}
	}, [isAuthenticated]);

	if (fileError) {
		return <Text color="redBright">⛔ {fileError}</Text>;
	}

	// Silent: no rendering at all (ID written directly via originalStdoutWrite)
	if (isSilent) {
		return null;
	}

	// Minimal: results and errors only, no spinners/progress
	if (isMinimal) {
		return (
			<>
				{!isCheckingAuth && !isAuthenticated && (
					<Text color="redBright">
						You are not authenticated. Run{' '}
						<Text color="blueBright">pulse login</Text> first.
					</Text>
				)}
				{errorMessage && (
					<>
						<Text color="redBright">❌ Failed to publish workflow.</Text>
						<Text color="redBright">Error: {errorMessage}</Text>
					</>
				)}
				{isPublished && (
					<>
						<Text color="greenBright">✅ Workflow published successfully.</Text>
						{publishedId && (
							<Text>Workflow ID: {publishedId}</Text>
						)}
					</>
				)}
			</>
		);
	}

	// Normal: full UI
	return (
		<>
			{isCheckingAuth && (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			)}
			{!isCheckingAuth && !isAuthenticated && (
				<Text color="redBright">
					You are not authenticated. Run{' '}
					<Text color="blueBright">pulse login</Text> first.
				</Text>
			)}
			{isPublishing && (
				<Box>
					<Spinner type="dots" />
					<Text> Publishing workflow...</Text>
				</Box>
			)}
			{errorMessage && (
				<>
					<Text color="redBright">❌ Failed to publish workflow.</Text>
					<Text color="redBright">Error: {errorMessage}</Text>
				</>
			)}
			{isPublished && (
				<>
					<Text color="greenBright">✅ Workflow published successfully.</Text>
					{publishedId && (
						<Text>Workflow ID: {publishedId}</Text>
					)}
				</>
			)}
		</>
	);
}
