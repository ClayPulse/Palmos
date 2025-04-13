#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {commandsManual} from './manual.js';
import {flags} from './flags.js';

const cli = meow(
	`\
Usage
  pulse [commands] [flags]

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
