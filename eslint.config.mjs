import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/coverage/**', '**/test-results/**', 'apps/frontend/next-env.d.ts'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['apps/backend/**/*.ts'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['apps/frontend/**/*.{ts,tsx}', 'e2e/**/*.ts', 'playwright.config.ts'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
        },
    },
);