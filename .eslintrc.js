module.exports = {
  extends: '@nori-dot-com/eslint-config-nori',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  overrides: [
    {
      files: ['**/*.test.*', './test/helpers/**/*.*'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
        'jest/valid-expect': 'off',
      },
    },
  ],
};
