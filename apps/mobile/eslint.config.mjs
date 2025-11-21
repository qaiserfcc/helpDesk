import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config({
  extends: [
    ...tseslint.configs.recommended,
    eslintPluginReact.configs.flat.recommended,
    eslintPluginPrettierRecommended
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  files: ['src/**/*.{ts,tsx}', 'App.tsx'],
  rules: {
    'react/react-in-jsx-scope': 'off'
  }
});
