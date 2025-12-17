import {execa} from 'execa';
import {getDepsBinPath} from './deps.js';

export async function cleanDist() {
	console.log('♻️  Cleaning dist directory...');
	await execa(`${getDepsBinPath('rimraf')} dist`, {
		shell: true,
	});
	console.log('✅ Cleaned dist directory.');
}
