import {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {Result} from 'meow';
import Spinner from 'ink-spinner';
import fs from 'fs';
import path from 'path';
import {Flags} from '../../lib/cli-flags.js';
import {checkToken, getToken} from '../../lib/token.js';
import {getBackendUrl} from '../../lib/backend-url.js';

// ---------------------------------------------------------------------------
// MultilineInput
// ---------------------------------------------------------------------------

function MultilineInput({
	onSubmit,
	focus,
}: {
	onSubmit: (value: string) => void;
	focus: boolean;
}) {
	const [lines, setLines] = useState<string[]>(['']);

	useInput(
		(input, key) => {
			// Regular Enter (\r) → submit
			// Shift+Enter → terminals send \n (0x0A) rather than setting key.shift+key.return
			if (input === '\n') {
				setLines(prev => [...prev, '']);
				return;
			}

			if (key.return) {
				const value = lines.join('\n').trim();
				if (value) onSubmit(value);
				return;
			}

			if (key.backspace || key.delete) {
				setLines(prev => {
					const next = [...prev];
					const last = next[next.length - 1]!;
					if (last.length > 0) {
						next[next.length - 1] = last.slice(0, -1);
					} else if (next.length > 1) {
						next.pop();
					}
					return next;
				});
				return;
			}

			if (input) {
				setLines(prev => {
					const next = [...prev];
					next[next.length - 1] += input;
					return next;
				});
			}
		},
		{isActive: focus},
	);

	return (
		<Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
			{lines.map((line, i) => (
				<Text key={i}>
					{line}
					{i === lines.length - 1 ? <Text backgroundColor="white"> </Text> : ''}
				</Text>
			))}
		</Box>
	);
}

// ---------------------------------------------------------------------------
// SkillCreate
// ---------------------------------------------------------------------------

function SkillCreate({cli}: {cli: Result<Flags>}) {
	const [skillName, setSkillName] = useState<string | undefined>(
		cli.input[2],
	);
	const [description, setDescription] = useState<string | undefined>(
		cli.flags.description,
	);
	const [status, setStatus] = useState<
		'authenticating' | 'generating' | 'done' | 'error'
	>();
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [chunkCount, setChunkCount] = useState<number>(0);

	// Once both fields are collected, authenticate
	useEffect(() => {
		if (!skillName || !description) return;
		setStatus('authenticating');
	}, [skillName, description]);

	useEffect(() => {
		if (status !== 'authenticating') return;

		async function authenticate() {
			const token = getToken(cli.flags.stage);
			if (token && (await checkToken(token, cli.flags.stage))) {
				setStatus('generating');
			} else {
				setErrorMessage(
					'You are not authenticated. Please run pulse login first.',
				);
				setStatus('error');
				setTimeout(() => process.exit(1), 0);
			}
		}

		authenticate();
	}, [status]);

	useEffect(() => {
		if (status !== 'generating' || !skillName || !description) return;

		async function generate() {
			const token = getToken(cli.flags.stage);
			const backendUrl = getBackendUrl(cli.flags.stage);

			try {
				const res = await fetch(
					`${backendUrl}/api/inference/cli/skill/create`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(token ? {Authorization: `Bearer ${token}`} : {}),
						},
						body: JSON.stringify({description}),
					},
				);

				if (!res.ok) {
					setErrorMessage(`Server returned error code ${res.status}.`);
					setStatus('error');
					setTimeout(() => process.exit(), 0);
					return;
				}

				const reader = res.body?.getReader();
				const decoder = new TextDecoder();
				let code = '';
				if (reader) {
					while (true) {
						const {done, value} = await reader.read();
						if (done) break;
						code += decoder.decode(value, {stream: true});
						setChunkCount(n => n + 1);
					}
				}

				const skillDir = path.join(process.cwd(), 'src', 'skill', skillName!);
				fs.mkdirSync(skillDir, {recursive: true});
				fs.writeFileSync(path.join(skillDir, 'action.ts'), code, 'utf-8');

				setStatus('done');
				setTimeout(() => process.exit(), 0);
			} catch (err: any) {
				setErrorMessage(err?.message ?? String(err));
				setStatus('error');
				setTimeout(() => process.exit(), 0);
			}
		}

		generate();
	}, [status]);

	return (
		<>
			{/* Step 1: prompt for skill name if not provided */}
			{!skillName && (
				<Box flexDirection="column">
					<Text>Skill name:</Text>
					<MultilineInput
						onSubmit={value => setTimeout(() => setSkillName(value), 0)}
						focus={!skillName}
					/>
				</Box>
			)}

			{/* Step 2: prompt for description if not provided */}
			{skillName && !description && (
				<Box flexDirection="column">
					<Text>
						What should this skill do?{' '}
						<Text color="blueBright">(Shift+Enter for newline, Enter to confirm)</Text>
					</Text>
					<MultilineInput
						onSubmit={value => setTimeout(() => setDescription(value), 0)}
						focus={!!skillName && !description}
					/>
				</Box>
			)}

			{/* Step 3: authenticating then generating */}
			{status === 'authenticating' && (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			)}

			{status === 'generating' && (
				<Box>
					<Spinner type="dots" />
					<Text> Generating skill action for "{skillName}"... </Text>
					<Text color="blueBright">[{chunkCount} chunks received]</Text>
				</Box>
			)}

			{status === 'done' && (
				<Text color="greenBright">
					✅ Skill action created at src/skill/{skillName}/action.ts
				</Text>
			)}

			{status === 'error' && (
				<Text color="redBright">❌ {errorMessage}</Text>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// SkillFix
// ---------------------------------------------------------------------------

function SkillFix({cli}: {cli: Result<Flags>}) {
	const [skillName, setSkillName] = useState<string | undefined>(
		cli.input[2],
	);
	const [status, setStatus] = useState<
		'authenticating' | 'fixing' | 'done' | 'error'
	>();
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [chunkCount, setChunkCount] = useState<number>(0);

	// Once skill name is collected, authenticate
	useEffect(() => {
		if (!skillName) return;
		setStatus('authenticating');
	}, [skillName]);

	useEffect(() => {
		if (status !== 'authenticating') return;

		async function authenticate() {
			const token = getToken(cli.flags.stage);
			if (token && (await checkToken(token, cli.flags.stage))) {
				// Validate file exists before fixing
				const actionPath = path.join(
					process.cwd(),
					'src',
					'skill',
					skillName!,
					'action.ts',
				);
				if (!fs.existsSync(actionPath)) {
					setErrorMessage(
						`Action file not found: src/skill/${skillName}/action.ts`,
					);
					setStatus('error');
					setTimeout(() => process.exit(), 0);
					return;
				}

				setStatus('fixing');
			} else {
				setErrorMessage(
					'You are not authenticated. Please run pulse login first.',
				);
				setStatus('error');
				setTimeout(() => process.exit(1), 0);
			}
		}

		authenticate();
	}, [status]);

	useEffect(() => {
		if (status !== 'fixing' || !skillName) return;

		async function fix() {
			const actionPath = path.join(
				process.cwd(),
				'src',
				'skill',
				skillName!,
				'action.ts',
			);
			const code = fs.readFileSync(actionPath, 'utf-8');

			const token = getToken(cli.flags.stage);
			const backendUrl = getBackendUrl(cli.flags.stage);

			try {
				const res = await fetch(`${backendUrl}/api/inference/cli/skill/fix`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(token ? {Authorization: `Bearer ${token}`} : {}),
					},
					body: JSON.stringify({code}),
				});

				if (!res.ok) {
					setErrorMessage(`Server returned error code ${res.status}.`);
					setStatus('error');
					setTimeout(() => process.exit(), 0);
					return;
				}

				const reader = res.body?.getReader();
				const decoder = new TextDecoder();
				let fixed = '';
				if (reader) {
					while (true) {
						const {done, value} = await reader.read();
						if (done) break;
						fixed += decoder.decode(value, {stream: true});
						setChunkCount(n => n + 1);
					}
				}

				fs.writeFileSync(actionPath, fixed, 'utf-8');
				setStatus('done');
				setTimeout(() => process.exit(), 0);
			} catch (err: any) {
				setErrorMessage(err?.message ?? String(err));
				setStatus('error');
				setTimeout(() => process.exit(), 0);
			}
		}

		fix();
	}, [status]);

	return (
		<>
			{/* Step 1: prompt for action name if not provided */}
			{!skillName && (
				<Box flexDirection="column">
					<Text>Action name:</Text>
					<MultilineInput
						onSubmit={value => setTimeout(() => setSkillName(value), 0)}
						focus={!skillName}
					/>
				</Box>
			)}

			{status === 'authenticating' && (
				<Box>
					<Spinner type="dots" />
					<Text> Checking authentication...</Text>
				</Box>
			)}

			{status === 'fixing' && (
				<Box>
					<Spinner type="dots" />
					<Text> Fixing JSDoc for skill "{skillName}"... </Text>
					<Text color="blueBright">[{chunkCount} chunks received]</Text>
				</Box>
			)}

			{status === 'done' && (
				<Text color="greenBright">
					✅ JSDoc fixed and saved to src/skill/{skillName}/action.ts
				</Text>
			)}

			{status === 'error' && (
				<Text color="redBright">❌ {errorMessage}</Text>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// Skill (top-level router)
// ---------------------------------------------------------------------------

export default function Skill({cli}: {cli: Result<Flags>}) {
	const subCommand = cli.input[1];

	if (subCommand === 'create') {
		return <SkillCreate cli={cli} />;
	}

	if (subCommand === 'fix') {
		return <SkillFix cli={cli} />;
	}

	return (
		<>
			<Text color="redBright">
				Unknown subcommand: {subCommand ?? '(none)'}
			</Text>
			<Text>
				Available subcommands:{'\n'}
				{'  '}pulse skill create {'<skill-name>'} --description "{'<description>'}"{'\n'}
				{'  '}pulse skill fix {'<action-name>'}
			</Text>
		</>
	);
}
