import { shouldBehaveLikeCrc } from './behaviors/Crc';
import { CRCV0_1_0 } from './helpers/Artifacts';

const CRCV0Tests = admin => {
  shouldBehaveLikeCrc(admin, CRCV0_1_0, true);
};
export default CRCV0Tests;
