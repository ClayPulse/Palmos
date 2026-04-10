import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {useEffect} from 'react';
import {buildProd} from '../../lib/build-prod.js';

export default function Build({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		(async () => {
			const buildTarget = cli.flags.target as 'client' | 'server' | undefined;
			try {
				await buildProd(buildTarget);
			} catch (err) {
				console.error('❌ Webpack build failed', err);
			}
		})();
	}, []);

	return <></>;
}
