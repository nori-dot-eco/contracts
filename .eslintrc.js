module.exports = {
  extends: ['airbnb-base', '@nori-dot-com/eslint-config-nori', 'prettier'],
  env: {
    browser: true,
    node: true,
    mocha: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  globals: {
    contract: false,
    assert: false,
    web3: true,
    artifacts: true,
  },
  rules: {
    camelcase: 'off',
    'no-plusplus': 'off',
    'one-var': 'off',
    'prefer-destructuring': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: true,
        peerDependencies: true,
      },
    ],
  },
};
