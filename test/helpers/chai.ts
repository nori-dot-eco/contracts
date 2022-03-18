import chaiModule from 'chai';
import sinonModule from 'sinon';
import sinonChai from 'sinon-chai';
import { solidity } from 'ethereum-waffle';
import chaiAsPromised from 'chai-as-promised';

export const chai = chaiModule.use(sinonChai).use(chaiAsPromised).use(solidity);
export const expect = chai.expect;
export const sinon = sinonModule;
