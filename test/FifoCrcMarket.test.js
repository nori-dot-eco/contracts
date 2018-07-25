import { shouldBehaveLikeFifoCrcMarketV0 } from './behaviors/FifoCrcMarket';
import { testFifoSaleBehavior } from './behaviors/FifoTokenizedCommodityMarket';

const FifoCrcMarketV0Tests = admin => {
  shouldBehaveLikeFifoCrcMarketV0(admin);
  testFifoSaleBehavior();
};
export default FifoCrcMarketV0Tests;
