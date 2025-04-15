import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import Spinner from 'ink-spinner';
import fs from 'fs';
import {$} from 'execa';
import {cwd} from 'process';

export default function Publish({cli}: {cli: Result<Flags>}) {
	const [isInProjectDir, setIsInProjectDir] = useState(false);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isBuilding, setIsBuilding] = useState(false);
	const [isBuildingError, setIsBuildingError] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isPublishingError, setIsPublishingError] = useState(false);
	const [isPublished, setIsPublished] = useState(false);

	useEffect(() => {
		// Check if the current dir contains pulse.config.ts
		const currentDir = process.cwd();
		const pulseConfigPath = `${currentDir}/pulse.config.ts`;
		if (fs.existsSync(pulseConfigPath)) {
			setIsInProjectDir(true);
		}
	}, []);

	// Check if the user is authenticated
	useEffect(() => {
		async function checkAuth() {
			const token = getToken();
			if (token) {
				const isValid = await checkToken(token);
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
			try {
				setIsBuilding(true);
				await $`npm run build`;
				// Zip the dist folder
				await $({cwd: 'dist'})`zip -r ../node_modules/@pulse-editor/dist.zip *`;
			} catch (error) {
				setIsBuildingError(true);
				return;
			} finally {
				setIsBuilding(false);
			}

			await publishExtension();
		}

		async function publishExtension() {
			setIsPublishing(true);

			// Upload the zip file to the server
			try {
				const formData = new FormData();
				const buffer = fs.readFileSync('./node_modules/@pulse-editor/dist.zip');
				const blob = new Blob([buffer], {
					type: 'application/zip',
				});
				const file = new File([blob], 'dist.zip', {
					type: 'application/zip',
				});
				formData.append('file', file, 'dist.zip');

				// Send the file to the server
				const res = await fetch(
					'https://pulse-editor.com/api/extension/publish',
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${getToken()}`,
						},
						body: formData,
					},
				);

				if (res.status === 200) {
					setIsPublished(true);
				} else {
					setIsPublishingError(true);
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
						<Text color={'redBright'}>❌ Failed to publish extension.</Text>
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
