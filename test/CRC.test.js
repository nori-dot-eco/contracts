import { shouldBehaveLikeCrc } from './behaviors/Crc';
import { CRC } from './helpers/Artifacts';

const CRCTests = admin => {
  shouldBehaveLikeCrc(admin, CRC);
};
export default CRCTests;
