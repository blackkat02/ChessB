import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  { ignores: ['dist', 'build', 'coverage', '.kilo'] },

  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'], // для React 17+: не вимагає import React
  {
    files: ['**/*.{js,jsx,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // PropTypes у проєкті не використовуються — без цього кожен проп
      // компонента підсвічувався б помилкою.
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },

  // Останнім: вимикає стилістичні правила, що конфліктують з Prettier,
  // і виводить розбіжності з .prettierrc як помилки 'prettier/prettier'.
  prettierRecommended,
];
