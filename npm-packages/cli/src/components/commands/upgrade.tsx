import {$} from 'execa';
import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import fs from 'fs';

export default function Upgrade({cli}: {cli: Result<Flags>}) {
	const [isInProjectDir, setIsInProjectDir] = useState(false);

	const [step, setStep] = useState<'check-config' | 'upgrade' | 'done'>(
		'check-config',
	);
	const [isError, setIsError] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		async function checkConfig() {
			// Check if the current dir contains pulse.config.ts
			const currentDir = process.cwd();
			const pulseConfigPath = `${currentDir}/pulse.config.ts`;
			if (fs.existsSync(pulseConfigPath)) {
				setIsInProjectDir(true);
			}

			setStep('upgrade');
		}
		checkConfig();
	}, []);

	useEffect(() => {
		async function start() {
			try {
				await upgradePackages();
			} catch (error: any) {
				setIsError(true);
				setErrorMessage(error.message);
			}
		}

		if (isInProjectDir) {
			start();
		}
	}, [isInProjectDir]);

	async function upgradePackages() {
		const tag = cli.flags.beta ? 'beta' : 'latest';

		await $`npm install react@${React.version} react-dom@${React.version} --save-exact --silent --force`;
		await $`npm install -D @pulse-editor/cli@${tag} --silent --force`;
		await $`npm install @pulse-editor/shared-utils@${tag} @pulse-editor/react-api@${tag} --silent --force`;

		// Remove webpack.config.ts if exists
		const webpackConfigPath = `${process.cwd()}/webpack.config.ts`;
		if (fs.existsSync(webpackConfigPath)) {
			fs.unlinkSync(webpackConfigPath);
		}

		setStep('done');
	}

	return (
		<>
			{isError ? (
				<Text color={'redBright'}>
					❌ An error occurred: {errorMessage || 'Unknown error'}
				</Text>
			) : !isInProjectDir ? (
				<Text color={'redBright'}>
					⛔ The current directory does not contain a Pulse Editor project.
				</Text>
			) : step === 'check-config' ? (
				<Box>
					<Spinner type="dots" />
					<Text> Checking configuration...</Text>
				</Box>
			) : step === 'upgrade' ? (
				<>
					<Box>
						<Spinner type="dots" />
						<Text> Upgrading packages...</Text>
					</Box>
				</>
			) : (
				<Box>
					<Text color={'greenBright'}>✅ Upgrade completed successfully.</Text>
				</Box>
			)}
		</>
	);
}
