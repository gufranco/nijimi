import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'docs/', 'test-results/', 'playwright-report/']
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: { ...globals.browser, ...globals.node }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      eqeqeq: 'error',
      curly: 'error',
      'max-depth': ['error', 3]
    }
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked
  }
);
