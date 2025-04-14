import {Result} from 'meow';
import {Flags} from '../../lib/cli-flags.js';
import React from 'react';
import {Text} from 'ink';

export default function Logout({cli}: {cli: Result<Flags>}) {
	return <Text>Logout from the Pulse Editor Platform</Text>;
}
