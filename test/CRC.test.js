import { shouldBehaveLikeCrc } from './behaviors/Crc';

const CRCTests = admin => {
  shouldBehaveLikeCrc(admin, true);
};
export default CRCTests;
