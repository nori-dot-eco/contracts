import { shouldBehaveLikeCrc } from './behaviors/Crc';
import { CRC } from './helpers/artifacts';

const CRCTests = admin => {
  shouldBehaveLikeCrc(admin, CRC);
};
export default CRCTests;
