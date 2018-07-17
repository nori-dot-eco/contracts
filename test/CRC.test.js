import { shouldBehaveLikeCrc } from './behaviors/Crc';
// import { testBasicCommodityFunctions } from './behaviors/BasicCommodity';

const CRCTests = admin => {
  shouldBehaveLikeCrc(admin);
  // testBasicCommodityFunctions(); // enabled in next pr
};
export default CRCTests;
