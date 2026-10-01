import humanmadeConfig from '@humanmade/eslint-config';

export default [
	{
		ignores: [ 'build/**', 'node_modules/**', 'vendor/**' ],
	},
	...humanmadeConfig,
	{
		rules: {
			// Mark variables used in JSX as used.
			'react/jsx-uses-vars': 'error',
		},
	},
];
