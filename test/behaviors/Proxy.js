// import { assertRevert } from '../helpers/utils';
// import {
//   UpgradeabilityProxy,
//   UpgradeabilityStorageTestV0,
// } from '../helpers/Artifacts';

// const testProxyFunctions = () => {
//   let proxy;
//   let v0sProxy;
//   let proxyImpAddr;
//   beforeEach(async () => {
//     proxy = await UpgradeabilityProxy.new(); // a V0 contract deployed using a deployed proxy's address
//     v0sProxy = await UpgradeabilityStorageTestV0.at(proxy.address);
//   });
//   describe('implementation', () => {
//     it('should return a 0 address for a proxy which has never invoked upgradeTo()', async () => {
//       proxyImpAddr = await proxy.implementation();
//       assert.equal(proxyImpAddr, '0x0000000000000000000000000000000000000000');
//     });
//   });
//   describe('fallback', () => {
//     it('should should revert when trying to use the fallback function on a proxy which has not called upgradeTo to set its implementation address', async () => {
//       assert.ok(v0sProxy.testProxyCall); // verify that the function exits on the contract instantiated using the proxy;
//       await assertRevert(v0sProxy.testProxyCall()); // but also make sure it cant be called since upgradeTo was never called to set the proxy implementation address
//     });
//   });
// };

// module.exports = {
//   testProxyFunctions,
// };
