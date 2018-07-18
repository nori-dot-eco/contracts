module.exports = function deploy(deployer, network) {
  deployer.then(async () => {
    global.network = network;
    // yeah we won't be using this...
  });
};
