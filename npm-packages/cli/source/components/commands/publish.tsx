import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import fs from 'fs';
import {$} from 'execa';

export default function Publish({cli}: {cli: Result<Flags>}) {
	const [isInProjectDir, setIsInProjectDir] = useState(false);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isBuilding, setIsBuilding] = useState(false);
	const [isBuildingError, setIsBuildingError] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isPublishingError, setIsPublishingError] = useState(false);
	const [isPublished, setIsPublished] = useState(false);

	const [failureMessage, setFailureMessage] = useState<string | undefined>(
		undefined,
	);

	useEffect(() => {
		async function checkConfig() {
			// Check if the current dir contains pulse.config.ts
			const currentDir = process.cwd();
			const pulseConfigPath = `${currentDir}/pulse.config.ts`;
			if (fs.existsSync(pulseConfigPath)) {
				setIsInProjectDir(true);
			}
		}
		checkConfig();
	}, []);

	// Check if the user is authenticated
	useEffect(() => {
		async function checkAuth() {
			const token = getToken(cli.flags.dev);
			if (token) {
				const isValid = await checkToken(token, cli.flags.dev);
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
			setIsBuilding(true);
			try {
				await $`npm run build`;
			}
			catch (error) {
				setIsBuildingError(true);
				setIsBuilding(false);
				setFailureMessage('Build failed. Please run `npm run build` to see the error.');
				return;
			}
			// Zip the dist folder
			try {
				await $({cwd: 'dist'})`zip -r ../node_modules/@pulse-editor/dist.zip *`;
			} catch (error) {
				setIsBuildingError(true);
				setIsBuilding(false);
				setFailureMessage('Failed to zip the build output.');
				return;
			} finally {
				setIsBuilding(false);
			}

			await publishExtension();
		}

		async function publishExtension() {
			setIsPublishing(true);

			// Read pulse.config.json for visibility
			const config = JSON.parse(
				fs.readFileSync('./dist/client/pulse.config.json', 'utf-8'),
			);

			const visibility = config.visibility as string;

			// Upload the zip file to the server
			try {
				const formData = new FormData();
				const buffer = fs.readFileSync('./node_modules/@pulse-editor/dist.zip');
				// @ts-ignore Create a Blob from the buffer
				const blob = new Blob([buffer], {
					type: 'application/zip',
				});
				formData.append('file', blob, 'dist.zip');
				formData.append('visibility', visibility);

				// Send the file to the server
				const res = await fetch(
					cli.flags.dev
						? 'https://localhost:8080/api/extension/publish'
						: 'https://pulse-editor.com/api/extension/publish',
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${getToken(cli.flags.dev)}`,
						},
						body: formData,
					},
				);

				if (res.status === 200) {
					setIsPublished(true);
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
			{!isInProjectDir ? (
				<Text color={'redBright'}>
					⛔ The current directory does not contain a Pulse Editor project.
				</Text>
			) : isCheckingAuth ? (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			) : isAuthenticated ? (
				<>
					{isBuilding && (
						<Box>
							<Spinner type="dots" />
							<Text> Building...</Text>
						</Box>
					)}
					{isBuildingError && (
						<Text color={'redBright'}>
							❌ Error building the extension. Please run `npm run build` to see
							the error.
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
			) : (
				<Text>
					You are not authenticated or your access token is invalid. Publishing
					to Extension Marketplace is in Beta access. Please visit
					<Text color={'blueBright'}> https://pulse-editor.com/beta </Text>to
					apply for Beta access.
				</Text>
			)}
		</>
	);
}
