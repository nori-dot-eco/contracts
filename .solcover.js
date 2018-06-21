module.exports = {
  norpc: true,
  copyPackages: ['zeppelin-solidity'],
  skipFiles: [
    'Migrations.sol',
    'single-quoted.sol',
    'double-quoted.sol',
    'doc-examples.sol',
    'on-top.sol',
    'zeppelin-solidity',
  ],
  compileCommand: 'truffle compile',
  testCommand: 'truffle test --network coverage',
  testrpcOptions: `--port 8555 -i coverage --noVMErrorsOnRPCResponse`,
};
