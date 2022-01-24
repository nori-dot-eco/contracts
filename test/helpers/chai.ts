import chaiModule from 'chai';
import { solidity } from 'ethereum-waffle';
import hardhatModule from 'hardhat';

export const hardhat = hardhatModule;
export const chai = chaiModule.use(solidity);
export const expect = chai.expect;
