import { shouldBehaveLikeTonToken } from './behaviors/TonToken';

const TonTokenTests = (admin, operator, recipient) => {
  contract('TonToken', () => {
    // temporay test suite showing that a troage/logic seperated instance of NoriV0 behaves identical to TonToken tests
    shouldBehaveLikeTonToken(admin, operator, recipient);
  });
};
export default TonTokenTests;
