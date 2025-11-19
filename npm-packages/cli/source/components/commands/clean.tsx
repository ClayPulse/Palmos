import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import {useEffect} from 'react';
import {cleanDist} from '../../lib/execa-utils/clean.js';

export default function Clean({cli}: {cli: Result<Flags>}) {
	useEffect(() => {
		// clean code
		cleanDist();
	}, []);
	return <></>;
}
