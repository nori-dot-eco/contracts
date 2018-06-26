import { shouldBehaveLikeCrc } from './behaviors/Crc';
import { CRCV0 } from './helpers/Artifacts';

const CRCV0Tests = admin => {
  shouldBehaveLikeCrc(admin, CRCV0, true);
};
export default CRCV0Tests;
