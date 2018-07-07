import { shouldBehaveLikeCrc } from './behaviors/Crc';

const CRCV0Tests = admin => {
  shouldBehaveLikeCrc(admin, true);
};
export default CRCV0Tests;
