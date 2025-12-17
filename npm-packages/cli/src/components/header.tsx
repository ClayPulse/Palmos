import {Box, Text} from 'ink';
import React from 'react';

export default function Header() {
	return (
		<Box flexDirection="column" alignItems="center">
			<Text color={'whiteBright'}>Pulse Editor CLI</Text>
			<Text>Version: 0.0.1</Text>
			<Text color={'blueBright'}>https://pulse-editor.com</Text>
		</Box>
	);
}
