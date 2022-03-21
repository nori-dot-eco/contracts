import chaiModule from 'chai';
import sinonModule from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

export const chai = chaiModule.use(sinonChai).use(chaiAsPromised);
export const expect = chai.expect;
export const sinon = sinonModule;
