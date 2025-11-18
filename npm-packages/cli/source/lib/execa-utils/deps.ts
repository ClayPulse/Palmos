import fs from 'fs';

// Get deps bin at node_modules/@pulse-editor/cli/node_modules
export function getDepsBinPath(name: string): string {
	const workingDir = process.cwd();
	// Check if the package is installed in the node_modules, if yes, just return "npx <name>"
	if (fs.existsSync(`${workingDir}/node_modules/${name}`)) {
		return `npx ${name}`;
	}

	// Check if the package exists in node_modules/@pulse-editor/cli/node_modules
	else if (
		fs.existsSync(
			`${workingDir}/node_modules/@pulse-editor/cli/node_modules/${name}`,
		)
	) {
		return `${workingDir}/node_modules/@pulse-editor/cli/node_modules/.bin/${process.platform === 'win32' ? `${name}.cmd` : name}`;
	}

	throw new Error(`Dependency ${name} not found.`);
}
