import { testProxyFunctions } from './behaviors/Proxy';

const ProxyTests = () => {
  contract('Proxy', () => {
    testProxyFunctions();
  });
};
export default ProxyTests;
