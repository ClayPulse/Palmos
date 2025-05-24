import {Result} from 'meow';
import React, {ReactNode, useEffect, useState} from 'react';
import {Flags} from '../../lib/cli-flags.js';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {$, execa} from 'execa';
import SelectInput from 'ink-select-input';
import {Item} from '../../lib/types.js';
import {UncontrolledTextInput} from 'ink-text-input';
import fs from 'fs';
import path from 'path';

export default function Create({cli}: {cli: Result<Flags>}) {
	const [framework, setFramework] = useState<string | undefined>(undefined);
	const [projectName, setProjectName] = useState<string | undefined>(undefined);

	const [isFrameworkSelected, setIsFrameworkSelected] = useState(false);

	const [message, setMessage] = useState<ReactNode>();

	const frameworkItems: Item<string>[] = [
		{
			label: 'React',
			value: 'react',
		},
		{
			label: 'Modern.js (WIP)',
			value: 'modernjs',
		},
		{
			label: 'Vue (WIP)',
			value: 'vue',
		},
		{
			label: 'Angular (WIP)',
			value: 'angular',
		},
	];

	useEffect(() => {
		const framework = cli.flags.framework;
		setFramework(framework);
	}, [cli]);

	useEffect(() => {
		async function createFromTemplate(name: string) {
			if (framework === 'react') {
				// Clone the template repository
				setMessage(
					<Box>
						<Spinner type="dots" />
						<Text>
							{' '}
							Creating a new Pulse Editor app using React template...
						</Text>
					</Box>,
				);
				try {
					await $`git clone --depth 1 https://github.com/ClayPulse/pulse-editor-extension-template.git ${name}`;
				} catch (error) {
					setMessage(
						<Text color="redBright">
							❌ Failed to clone the template. Please check your internet
							connection and try again.
						</Text>,
					);
					return;
				}

				// Modify the package.json file to update the name
				setMessage(
					<Box>
						<Spinner type="dots" />
						<Text> Initializing project...</Text>
					</Box>,
				);
				const packageJsonPath = path.join(process.cwd(), name, 'package.json');
				const packageJson = JSON.parse(
					fs.readFileSync(packageJsonPath, 'utf8'),
				);
				packageJson.name = name.replaceAll('-', '_');

				// Write the modified package.json back to the file
				fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

				// Remove the .git directory
				const gitDirPath = path.join(process.cwd(), name, '.git');
				if (fs.existsSync(gitDirPath)) {
					fs.rmSync(gitDirPath, {recursive: true, force: true});
				}

				// Remove the .github directory
				const githubDirPath = path.join(process.cwd(), name, '.github');
				if (fs.existsSync(githubDirPath)) {
					fs.rmSync(githubDirPath, {recursive: true, force: true});
				}

				setMessage(
					<Box>
						<Spinner type="dots" />
						<Text> Installing dependencies...</Text>
					</Box>,
				);
				// Run `npm i`
				try {
					await execa(`npm install`, {
						cwd: path.join(process.cwd(), name),
					});
				} catch (error) {
					setMessage(
						<Text color="redBright">
							❌ Failed to install dependencies. Please check your internet
							connection and try again.
						</Text>,
					);
					return;
				}
				setMessage(
					<Text>🚀 Pulse Editor React app project created successfully!</Text>,
				);
			}
		}

		if (projectName) {
			// Check if the project already exists
			const projectPath = path.join(process.cwd(), projectName);
			if (fs.existsSync(projectPath)) {
				setMessage(
					<Text color="redBright">
						❌ A project with same name already exists in current path.
					</Text>,
				);
				return;
			}
			createFromTemplate(projectName);
		}
	}, [projectName]);

	useEffect(() => {
		setTimeout(() => {
			setIsFrameworkSelected(framework !== undefined);
		}, 0);
	}, [framework]);

	return (
		<>
			{!cli.flags.framework && (
				<>
					<Text>
						🚩Create a new Pulse Editor app using your favorite web framework!
					</Text>
					<SelectInput
						items={frameworkItems}
						onSelect={item => {
							setFramework(item.value);
						}}
						isFocused={framework === undefined}
					/>

					<Text> </Text>
				</>
			)}

			{isFrameworkSelected && (
				<>
					<Box>
						<Text>Enter your project name: </Text>
						<UncontrolledTextInput
							onSubmit={value => setProjectName(value)}
							focus={projectName === undefined}
						/>
					</Box>

					{projectName && (
						<>
							{framework === 'react' && <>{message}</>}
							{framework !== 'react' && (
								<Text>
									🚧 Currently not available. We'd like to invite you to work on
									these frameworks if you are interested in! Check out our
									tutorial to integrate your favorite web framework with Pulse
									Editor using Module Federation.
								</Text>
							)}
						</>
					)}
				</>
			)}
		</>
	);
}
