/* eslint-env node */
module.exports = {
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	rules: {
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/consistent-type-imports': 'error',
	},
	root: true,
};
