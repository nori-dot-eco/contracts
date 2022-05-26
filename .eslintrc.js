const { parserOptions } = require('@nori-dot-com/eslint-config-nori/rules');

module.exports = {
  extends: '@nori-dot-com/eslint-config-nori',
  parserOptions: parserOptions({
    typescript: true,
    dir: __dirname,
    react: false,
  }),
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
