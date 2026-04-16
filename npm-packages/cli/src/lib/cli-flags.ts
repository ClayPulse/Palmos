import {Flag} from 'meow';

type StringFlag = Flag<'string', string> | Flag<'string', string[], true>;
type BooleanFlag = Flag<'boolean', boolean> | Flag<'boolean', boolean[], true>;
type NumberFlag = Flag<'number', number> | Flag<'number', number[], true>;
type AnyFlag = StringFlag | BooleanFlag | NumberFlag;
type AnyFlags = Record<string, AnyFlag>;

// Helper to preserve literal types *and* validate against AnyFlags
function defineFlags<T extends AnyFlags>(flags: T) {
	return flags;
}

export const flags = defineFlags({
	token: {
		type: 'boolean',
	},
	flow: {
		type: 'boolean',
	},
	framework: {
		type: 'string',
		shortFlag: 'f',
	},
	stage: {
		type: 'boolean',
		default: false,
	},
	stageServer: {
		type: 'string',
	},
	name: {
		type: 'string',
		shortFlag: 'n',
	},
	visibility: {
		type: 'string',
		shortFlag: 'v',
	},
	target: {
		type: 'string',
		shortFlag: 't',
	},
	beta: {
		type: 'boolean',
	},
	build: {
		type: 'boolean',
		default: true,
	},
	path: {
		type: 'string',
		shortFlag: 'p',
	},
	displayName: {
		type: 'string',
	},
	description: {
		type: 'string',
		shortFlag: 'd',
	},
	continue: {
		type: 'boolean',
		default: false,
	},
	logLevel: {
		type: 'string',
		default: 'normal',
	},
});

export type Flags = typeof flags;
