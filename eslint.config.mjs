import globals from 'globals';
export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { ...globals.browser, ...globals.jest, process: 'readonly', global: 'readonly' } },
  // Preserve the existing gate without an unrelated style refactor.
  rules: { 'no-undef': 'error' },
}];
