import { defineConfig } from 'eslint/config'
import { globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: process.cwd()
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  [
    globalIgnores([
      'dist/**',
      '**/dist',
      '**/dist/**',
      'node_modules/**',
      '**/dist',
      '**/node_modules'
    ])
  ],
  {
    rules: {
      'semi': ['error', 'never'],
      'quotes': ['error', 'single'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn', {
          'argsIgnorePattern': '^_|_',
          'vars': 'all',
          'args': 'after-used',
          'ignoreRestSiblings': false,
          'varsIgnorePattern': '^I[A-Z]|^_',
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/triple-slash-reference': ['error', {
        'path': 'always'
      }]
    }
  },
)
