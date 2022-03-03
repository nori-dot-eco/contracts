import chaiModule from 'chai';
import sinonModule from 'sinon';
import sinonChai from 'sinon-chai';
import { solidity } from 'ethereum-waffle';

import { hre } from '@/utils/hre';

export const hardhat = hre;
export const chai = chaiModule.use(solidity).use(sinonChai);
export const expect = chai.expect;
export const sinon = sinonModule;
