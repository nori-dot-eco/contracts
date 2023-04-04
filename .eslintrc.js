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
      extends: [
        'plugin:@fintechstudios/chai-as-promised/recommended',
        'plugin:chai-expect/recommended',
        'plugin:chai-friendly/recommended',
      ],
      files: ['**/*.test.*', './test/helpers/**/*.*'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 0,
        'jest/valid-expect': 0, // this package does not use jest explicitly
        'jest/no-deprecated-functions': 0, // this package does not use jest explicitly
        'local-rules/waffle-as-promised': 2,
      },
    },
  ],
};
