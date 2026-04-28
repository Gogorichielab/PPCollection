const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'no-implicit-coercion': ['error', { boolean: false, number: true, string: true }],
      'no-param-reassign': 'error',
      curly: ['error', 'multi-line'],
      'prefer-template': 'error',
      'object-shorthand': 'error',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-param-reassign': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'coverage/**', '.github/**'],
  },
];
