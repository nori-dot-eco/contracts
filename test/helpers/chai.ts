import chaiModule from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

export const chai: Chai.ChaiStatic = chaiModule
  .use(sinonChai)
  .use(chaiAsPromised);
export const expect = chai.expect;

export { default as sinon } from 'sinon';
