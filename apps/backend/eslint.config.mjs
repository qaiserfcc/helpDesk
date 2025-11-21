import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config({
  extends: [
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended
  ],
  files: ['src/**/*.{ts,tsx}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json'
    }
  },
  rules: {
    'no-console': ['warn', { allow: ['error'] }]
  }
});
