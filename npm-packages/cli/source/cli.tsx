#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
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
Examples
  pulse help publish
`,
	{
		importMeta: import.meta,
		flags: flags,
	},
);

render(<App cli={cli} />);
