import {Result} from 'meow';
import {ReactNode, useEffect, useState} from 'react';
import {Flags} from '../../lib/cli-flags.js';
import {Box, Text, useApp} from 'ink';
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
	const [visibility, setVisibility] = useState<string | undefined>(undefined);

	const [isShowFrameworkSelect, setIsShowFrameworkSelect] =
		useState<boolean>(true);
	const [isShowProjectNameInput, setIsShowProjectNameInput] =
		useState<boolean>(false);
	const [isShowVisibilitySelect, setIsShowVisibilitySelect] =
		useState<boolean>(false);

	const [createMessage, setCreateMessage] = useState<ReactNode>();
	const [errorMessage, setErrorMessage] = useState<ReactNode>();

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

	const {exit} = useApp();

	useEffect(() => {
		const framework = cli.flags.framework;
		if (framework) {
			setFramework(framework);
		} else {
			setIsShowFrameworkSelect(true);
		}
	}, [cli]);

	useEffect(() => {
		if (framework) {
			const name = cli.flags.name;
			if (name) {
				setProjectName(name);
			} else {
				setIsShowProjectNameInput(true);
			}
		}
	}, [framework, cli]);

	useEffect(() => {
		if (projectName) {
			// Check if the project already exists
			const projectPath = path.join(process.cwd(), projectName);
			if (fs.existsSync(projectPath)) {
				setErrorMessage(
					<Text color="redBright">
						❌ A project with same name already exists in current path.
					</Text>,
				);
				setTimeout(() => {
					exit();
				}, 0);
				return;
			}

			const visibility = cli.flags.visibility;
			if (visibility) {
				setVisibility(visibility);
			} else {
				setIsShowVisibilitySelect(true);
			}
		}
	}, [projectName, cli]);

	useEffect(() => {
		if (visibility && projectName) {
			createFromTemplate(projectName, visibility);
		}
	}, [visibility, projectName]);

	async function createFromTemplate(name: string, visibility: string) {
		if (framework === 'react') {
			// Clone the template repository
			setCreateMessage(
				<Box>
					<Spinner type="dots" />
					<Text> Creating a new Pulse Editor app using React template...</Text>
				</Box>,
			);
			try {
				await $`git clone --depth 1 https://github.com/ClayPulse/pulse-app-template.git ${name}`;
			} catch (error) {
				setCreateMessage(
					<Text color="redBright">
						❌ Failed to clone the template. Please check your internet
						connection and try again.
					</Text>,
				);
				return;
			}

			// Modify the package.json file to update the name
			setCreateMessage(
				<Box>
					<Spinner type="dots" />
					<Text> Initializing project...</Text>
				</Box>,
			);

			/* Setup pulse.config.ts */
			const pulseConfigPath = path.join(process.cwd(), name, 'pulse.config.ts');
			let pulseConfig = fs.readFileSync(pulseConfigPath, 'utf8');
			// Modify visibility by matching the block that starts with 'visibility:',
			// and replacing the entire line with the new visibility value.
			pulseConfig = pulseConfig.replace(
				/visibility:\s*['"`](public|unlisted|private)['"`],?/,
				`visibility: '${visibility}',`,
			);
			fs.writeFileSync(pulseConfigPath, pulseConfig);

			/* Setup packages.json */
			const packageJsonPath = path.join(process.cwd(), name, 'package.json');
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
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

			// Remove LICENSE file
			const licenseFilePath = path.join(process.cwd(), name, 'LICENSE');
			if (fs.existsSync(licenseFilePath)) {
				fs.rmSync(licenseFilePath, {force: true});
			}

			setCreateMessage(
				<Box>
					<Spinner type="dots" />
					<Text> Installing dependencies...</Text>
				</Box>,
			);
			// Run `npm i`
			try {
				await execa(`npm install`, {
					cwd: path.join(process.cwd(), name),
					shell: true,
				});
			} catch (error: any) {
				setCreateMessage(
					<Text color="redBright">
						❌ Failed to install dependencies. Please check your internet
						connection and try again.
					</Text>,
				);
				return;
			}
			setCreateMessage(
				<Text>🚀 Pulse Editor React app project created successfully!</Text>,
			);
		}
	}

	return (
		<>
			{isShowFrameworkSelect && (
				<FrameworkSelect
					cli={cli}
					frameworkItems={frameworkItems}
					framework={framework}
					setFramework={setFramework}
				/>
			)}

			{isShowProjectNameInput && (
				<ProjectNameInput
					projectName={projectName}
					setProjectName={setProjectName}
				/>
			)}

			{isShowVisibilitySelect && (
				<VisibilitySelect
					visibility={visibility}
					setVisibility={setVisibility}
				/>
			)}

			{visibility !== undefined && (
				<>
					{framework === 'react' && <>{createMessage}</>}
					{framework !== 'react' && (
						<Text>
							🚧 Currently not available. We'd like to invite you to work on
							these frameworks if you are interested in! Check out our tutorial
							to integrate your favorite web framework with Pulse Editor using
							Module Federation.
						</Text>
					)}
				</>
			)}

			<Text>{errorMessage}</Text>
		</>
	);
}

function FrameworkSelect({
	cli,
	frameworkItems,
	framework,
	setFramework,
}: {
	cli: any;
	frameworkItems: Item<string>[];
	framework: string | undefined;
	setFramework: (value: string) => void;
}) {
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
		</>
	);
}

function ProjectNameInput({
	projectName,
	setProjectName,
}: {
	projectName: string | undefined;
	setProjectName: (value: string) => void;
}) {
	return (
		<>
			<Box>
				<Text>Enter your project name: </Text>

				<UncontrolledTextInput
					onSubmit={value => setTimeout(() => setProjectName(value), 0)}
					focus={projectName === undefined}
				/>
			</Box>
		</>
	);
}

function VisibilitySelect({
	visibility,
	setVisibility,
}: {
	visibility: string | undefined;
	setVisibility: (value: string) => void;
}) {
	return (
		<>
			<Text>Enter marketplace visibility for your project:</Text>

			<SelectInput
				items={[
					{label: 'Public', value: 'public'},
					{label: 'Unlisted', value: 'unlisted'},
					{label: 'Private', value: 'private'},
				]}
				onSelect={item => {
					setVisibility(item.value);
				}}
				isFocused={visibility === undefined}
			/>

			<Text> </Text>
		</>
	);
}
