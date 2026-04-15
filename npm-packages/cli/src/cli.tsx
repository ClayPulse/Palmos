#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import cp from 'child_process';
import App from './app.js';
import {commandsManual} from './lib/manual.js';
import {flags} from './lib/cli-flags.js';

const cli = meow(
	`\
Usage
  pulse [command] [flags]

Commands
${Object.entries(commandsManual)
	.map(([_, description]) => `${description}`)
	.join('')}
Global Flags
  --log-level <level>  Output level: normal (default), minimal, or silent.
                       normal   — full UI with spinners and progress.
                       minimal  — results and errors only, no progress UI.
                       silent   — completely silent; errors printed to stderr on failure.
                       Non-normal modes require all input via flags/arguments.

Examples
  pulse help publish

`,
	{
		importMeta: import.meta,
		flags: flags,
	},
);

const verboseLevel = (cli.flags.logLevel ?? 'normal') as string;

if (verboseLevel !== 'normal') {
	// ── Guard: reject interactive usage in non-normal modes ─────────
	const command = cli.input[0];

	const missingArgs: Record<string, string> = {};

	if (command === 'login') {
		if (!cli.flags.token && !cli.flags.flow) {
			missingArgs['login'] = '--token or --flow';
		}
	} else if (command === 'create') {
		if (!cli.flags.framework) missingArgs['--framework (-f)'] = 'e.g. react';
		if (!cli.flags.name) missingArgs['--name (-n)'] = 'project name';
		if (!cli.flags.displayName) missingArgs['--displayName'] = 'display name';
		if (!cli.flags.visibility) missingArgs['--visibility (-v)'] = 'public, unlisted, or private';
	} else if (command === 'code') {
		if (!cli.flags.name && !cli.flags.continue) missingArgs['--name (-n)'] = 'app name';
		if (cli.input.length < 2) missingArgs['<prompt>'] = 'prompt text as positional argument';
	} else if (command === 'skill') {
		const sub = cli.input[1];
		if (sub === 'create') {
			if (!cli.input[2]) missingArgs['<skill-name>'] = 'positional argument';
			if (!cli.flags.description) missingArgs['--description (-d)'] = 'skill description';
		} else if (sub === 'fix') {
			if (!cli.input[2]) missingArgs['<action-name>'] = 'positional argument';
		}
	}

	if (Object.keys(missingArgs).length > 0) {
		const details = Object.entries(missingArgs)
			.map(([flag, hint]) => `  ${flag}: ${hint}`)
			.join('\n');
		process.stderr.write(
			`\x1b[31mError: --log-level ${verboseLevel} requires all input via flags/arguments. Missing:\n${details}\x1b[0m\n`,
		);
		process.exit(1);
	}

	if (verboseLevel === 'silent') {
		// ── Silent: suppress ALL output ──────────────────────────────
		process.stdout.write = (() => true) as any;
		const origStderrWrite = process.stderr.write.bind(process.stderr);
		process.stderr.write = (() => true) as any;

		console.log = () => {};
		console.info = () => {};
		console.warn = () => {};

		const stderrBuffer: string[] = [];
		console.error = (...args: any[]) => {
			const msg = args
				.map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
				.join(' ');
			stderrBuffer.push(msg);
		};

		process.on('exit', (code) => {
			if (code !== 0 && stderrBuffer.length > 0) {
				origStderrWrite(`\x1b[31m${stderrBuffer.join('\n')}\x1b[0m\n`);
			}
		});

		const handleError = (err: unknown) => {
			const message = err instanceof Error ? err.message : String(err);
			stderrBuffer.push(message);
			process.exitCode = 1;
		};
		process.on('uncaughtException', handleError);
		process.on('unhandledRejection', handleError);
	} else if (verboseLevel === 'minimal') {
		// ── Minimal: suppress noisy console but keep Ink rendering ───
		// Components are responsible for hiding spinners/progress in minimal mode.
		console.log = () => {};
		console.info = () => {};
		console.warn = () => {};
	}

	// Silence forked child processes (e.g. Module Federation DTS plugin)
	const origFork = cp.fork.bind(cp);
	(cp as any).fork = (
		modulePath: string,
		...rest: any[]
	) => {
		let args: string[] | undefined;
		let options: any;
		if (Array.isArray(rest[0])) {
			args = rest[0];
			options = rest[1] ?? {};
		} else {
			args = undefined;
			options = rest[0] ?? {};
		}
		options.stdio = ['pipe', 'pipe', 'pipe', 'ipc'];
		const child = args
			? origFork(modulePath, args, options)
			: origFork(modulePath, options);
		child.stdout?.resume();
		child.stderr?.resume();
		return child;
	};
}

render(<App cli={cli} />);
