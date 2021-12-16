const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const { singletons } = require('@openzeppelin/test-helpers');

const NORI = artifacts.require('NORI');
const Removal = artifacts.require('Removal');
const Certificate = artifacts.require('Certificate');
const FIFOMarket = artifacts.require('FIFOMarket');

module.exports = async function (deployer, network, accounts) {
  if (['develop', 'test'].includes(network)) {
    console.log("DEPLOYED REGISTRY")
    await singletons.ERC1820Registry(accounts[0]); // In a test environment an ERC777 token requires deploying an ERC1820 registry
  }
  const noriInstance = await deployProxy(NORI, [], { deployer });
  const removalInstance = await deployProxy(Removal, [], { deployer });
  const certificateInstance = await deployProxy(Certificate, [], { deployer });
  const fifoMarketInstance = await deployProxy(FIFOMarket, [
    removalInstance.address, 
    noriInstance.address,
    certificateInstance.address,
    accounts[9],
    this.web3.utils.toWei('0.15')
  ], { deployer });
  console.log('Deployed', noriInstance.address);
  console.log('Deployed', removalInstance.address);
  console.log('Deployed', certificateInstance.address);
  console.log('Deployed', fifoMarketInstance.address);
  // await noriInstance.contract.methods.mint(accounts[3],this.web3.utils.toWei('200'),"0x0","0x0").send({from:accounts[0]});
  // console.log('NORI balance accounts[1]', await noriInstance.contract.methods.balanceOf(accounts[1]).call({from:accounts[0]}));
  // const mintBatchTx = await (removalInstance.contract.methods.mintBatch(accounts[2],[this.web3.utils.toWei('100'),this.web3.utils.toWei('10'),this.web3.utils.toWei('50')],[2018, 2019, 2020],"0x0").send({from:accounts[0], gas: 5000000 })); // 264919
  // console.log("mintBatchTx gasUsed", mintBatchTx.gasUsed); // 264919 ($.01 - $.10)
  // console.log('Removal balances accounts[2] for token ids [0,1,2]', await removalInstance.contract.methods.balanceOfBatch([accounts[2],accounts[2],accounts[2]], [0,1,2]).call({from:accounts[0]}));
  // const removalSafeBatchTransferFrom = await (removalInstance.contract.methods.safeBatchTransferFrom(accounts[2],fifoMarketInstance.address,[0,1,2],[this.web3.utils.toWei('100'),this.web3.utils.toWei('10'),this.web3.utils.toWei('50')],"0x0").send({from:accounts[2], gas: 5000000 }));
  // console.log("removalSafeBatchTransferFrom gasUsed", removalSafeBatchTransferFrom.gasUsed); // 221449 ($.01 - $.10)
  // const noriSend = await (noriInstance.contract.methods.send(fifoMarketInstance.address,this.web3.utils.toWei('170'),"0x0").send({from:accounts[3], gas: 5000000 }));
  // console.log("noriSend gasUsed", noriSend.gasUsed); 



  
};