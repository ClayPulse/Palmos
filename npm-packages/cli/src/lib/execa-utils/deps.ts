import fs from 'fs';
import path from 'path';
import {CLI_ROOT} from '../resolve-cli-root.js';

// Get deps bin — works with npm, pnpm (hoisted or not), and yarn
export function getDepsBinPath(name: string): string {
	const workingDir = process.cwd();

	// 1. Check if the package is installed in the project's own node_modules
	if (fs.existsSync(path.join(workingDir, 'node_modules', name))) {
		return `npx ${name}`;
	}

	// 2. Check in @pulse-editor/cli's own node_modules (npm nested installs)
	const cliBin = path.join(
		CLI_ROOT,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? `${name}.cmd` : name,
	);
	if (fs.existsSync(cliBin)) {
		return cliBin;
	}

	// 3. Walk up from CLI_ROOT looking for the binary in ancestor node_modules/.bin
	//    This handles pnpm hoisted layouts where deps live in a parent node_modules
	let dir = path.dirname(CLI_ROOT);
	while (dir !== path.dirname(dir)) {
		const binPath = path.join(
			dir,
			'.bin',
			process.platform === 'win32' ? `${name}.cmd` : name,
		);
		if (fs.existsSync(binPath)) {
			return binPath;
		}

		// Go up — if we're inside a node_modules, keep going
		const parent = path.dirname(dir);
		if (path.basename(parent) === 'node_modules' || path.basename(dir) === 'node_modules') {
			dir = parent;
		} else {
			break;
		}
	}

	// 4. Fallback: npx will search PATH
	return `npx ${name}`;
}
