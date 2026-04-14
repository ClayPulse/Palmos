import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import fs from 'fs';
import {$} from 'execa';
import {publishApp} from '../../lib/backend/publish-app.js';
import {buildProd} from '../../lib/build-prod.js';

export default function Publish({cli}: {cli: Result<Flags>}) {
	const [isInProjectDir, setIsInProjectDir] = useState<boolean | null>(null);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isBuilding, setIsBuilding] = useState(false);
	const [isBuildingError, setIsBuildingError] = useState(false);
	const [isZipping, setIsZipping] = useState(false);
	const [isZippingError, setIsZippingError] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isPublishingError, setIsPublishingError] = useState(false);
	const [isPublished, setIsPublished] = useState(false);

	const [failureMessage, setFailureMessage] = useState<string | undefined>(
		undefined,
	);

	// Exit with error code when a terminal failure state is reached
	useEffect(() => {
		const failed =
			isInProjectDir === false ||
			(!isCheckingAuth && !isAuthenticated) ||
			isBuildingError ||
			isZippingError ||
			isPublishingError;
		if (!failed) return undefined;
		// Defer so Ink can flush the error text before the process exits
		const timer = setTimeout(() => process.exit(1), 0);
		return () => clearTimeout(timer);
	}, [isInProjectDir, isCheckingAuth, isAuthenticated, isBuildingError, isZippingError, isPublishingError]);

	useEffect(() => {
		async function checkConfig() {
			// Check if the current dir contains pulse.config.ts
			const currentDir = process.cwd();
			const pulseConfigPath = `${currentDir}/pulse.config.ts`;
			setIsInProjectDir(fs.existsSync(pulseConfigPath));
		}
		checkConfig();
	}, []);

	// Check if the user is authenticated
	useEffect(() => {
		async function checkAuth() {
			const token = getToken(cli.flags.stage);
			if (token) {
				const isValid = await checkToken(token, cli.flags.stage);
				if (isValid) {
					setIsAuthenticated(true);
				}
			}
			setIsCheckingAuth(false);
		}

		if (isInProjectDir) {
			checkAuth();
		}
	}, [isInProjectDir]);

	// Build the extension
	useEffect(() => {
		async function buildExtension() {
			if (cli.flags.build) {
				setIsBuilding(true);
				try {
					// Run the same in-process build pipeline as `pulse build`. We
					// deliberately do NOT shell out to `npm run build` here — that
					// would resolve a different `pulse` binary (project-local vs
					// global) and potentially load a different webpack/MF tree.
					await buildProd(
						cli.flags.target as 'client' | 'server' | undefined,
					);
				} catch (error: any) {
					setIsBuildingError(true);
					setFailureMessage(
						error?.stack || error?.message || String(error),
					);
					return;
				} finally {
					setIsBuilding(false);
				}
			}

			// Halt if the build did not actually produce a dist/ directory —
			// this catches cases where the build script exited 0 but emitted
			// nothing (or where --no-build was passed without a prior build).
			if (!fs.existsSync('dist') || fs.readdirSync('dist').length === 0) {
				setIsBuildingError(true);
				setFailureMessage(
					'No build output found at `dist/`. ' +
						(cli.flags.build
							? 'The build script completed but did not produce any output.'
							: 'Run `pulse build` first, or omit `--no-build`.'),
				);
				return;
			}

			setIsZipping(true);
			// Zip the dist folder
			try {
				await $({cwd: 'dist'})`zip -r ../node_modules/@pulse-editor/dist.zip .`;
			} catch (error: any) {
				setIsZippingError(true);
				setFailureMessage('Failed to zip the build output. ' + error.message);
				return;
			} finally {
				setIsZipping(false);
			}

			await publishExtension();
		}

		async function publishExtension() {
			setIsPublishing(true);

			try {
				const res = await publishApp(cli.flags.stage);

				if (res.status === 200) {
					setIsPublished(true);
					setTimeout(() => process.exit(0), 0);
				} else {
					setIsPublishingError(true);
					const msg = await res.json();
					if (msg.error) {
						setFailureMessage(msg.error);
					} else {
						setFailureMessage('Unknown error occurred while publishing.');
					}
				}
			} catch (error) {
				console.error('Error uploading the file:', error);
				setIsPublishingError(true);
				return;
			} finally {
				setIsPublishing(false);
			}
		}

		if (isAuthenticated) {
			buildExtension();
		}
	}, [isAuthenticated]);

	return (
		<>
			{isInProjectDir === false ? (
				<Text color={'redBright'}>
					⛔ The current directory does not contain a Pulse Editor project.
				</Text>
			) : isCheckingAuth ? (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			) : !isAuthenticated ? (
				<Text>
					You are not authenticated or your access token is invalid. Publishing
					to Extension Marketplace is in Beta access. Please visit
					<Text color={'blueBright'}> https://palmos.ai/beta </Text>to
					apply for Beta access.
				</Text>
			) : (
				<>
					{isBuilding && (
						<Box>
							<Spinner type="dots" />
							<Text> Building...</Text>
						</Box>
					)}
					{isBuildingError && (
						<>
							<Text color={'redBright'}>❌ Error building the extension.</Text>
							{failureMessage && (
								<Text color={'redBright'}>{failureMessage}</Text>
							)}
						</>
					)}
					{isZipping && (
						<Box>
							<Spinner type="dots" />
							<Text> Compressing build...</Text>
						</Box>
					)}
					{isZippingError && (
						<Text color={'redBright'}>
							❌ Error zipping the build output. {failureMessage}
						</Text>
					)}
					{isPublishing && (
						<Box>
							<Spinner type="dots" />
							<Text> Publishing...</Text>
						</Box>
					)}
					{isPublishingError && (
						<>
							<Text color={'redBright'}>❌ Failed to publish extension.</Text>
							{failureMessage && (
								<Text color={'redBright'}>Error: {failureMessage}</Text>
							)}
						</>
					)}
					{isPublished && (
						<Text color={'greenBright'}>
							✅ Extension published successfully.
						</Text>
					)}
				</>
			)}
		</>
	);
}
