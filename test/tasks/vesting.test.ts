/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import type { Octokit } from '@octokit/rest';

import { grantSchema, validation } from '../../tasks/vesting';
import { formatEthereumTime, formatTokenString } from '../../utils/units';

import * as github from '@/tasks/utils/github';
import { expect, setupTestEnvironment, sinon } from '@/test/helpers'; // todo deprecate exported hardhat, use hre from @/utils

const MOCK_GITHUB_VESTING_DATA = [
  'recipient,contactUUID,originalAmount,startTime,vestEndTime,unlockEndTime,cliff1Time,cliff2Time,vestCliff1Amount,vestCliff2Amount,unlockCliff1Amount,unlockCliff2Amount,lastRevocationTime,lastQuantityRevoked',
  '0xDD66B46910918B2F442D6b75C6E55631ad678c99,4c728e75-0aef-42f6-8ee3-3a831734e048,46425.5886,2022-07-14T00:00:00Z,2026-07-14T00:00:00Z,2027-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,11606.39715,17409.59573,4642.55886,9285.11772,,',
  '0x465d5a3fFeA4CD109043499Fa576c3E16f918463,ecd76b5a-9188-49c6-b456-d49ed3a68e5e,73000,,,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,0,0,73000,0,,',
  '0x3254678253467832548762382348765342765342,e0507d82-9c5a-4eb2-853f-d73a97790fec,120,,,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,0,0,120,0,,',
  '0x8eB185e20A9B7b31bd48DA19E834B93bE952795E,fa116039-a696-473a-8be8-4d970e437421,6454545,,,2026-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,0,0,806818.125,1613636.25,,',
  '0x6b9d03759E9F14a641f0703fBD84F1F726159B6B,ac88ed0f-d4de-4538-a18b-ae6f4c6cfe00,20000000,,,2027-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,0,0,2000000,4000000,,',
  '0xBd6E6A75c7A51cfdf08DDf2f538ceB221835839b,daf2922b-c96d-442e-a267-e977758961f1,50000,2023-03-03T00:00:00Z,2027-03-03T00:00:00Z,2028-03-03T00:00:00Z,2024-03-03T00:00:00Z,2024-09-03T00:00:00Z,12500,18750,5000,10000,,',
  '0x8aBFd8375DA1521E70d23988eb5a6efA799C15ea,614dadfd-279a-4cb4-886d-32305a3b61e2,14010.6,,,2028-10-02T00:00:00Z,2028-10-02T00:00:00Z,2028-10-02T00:00:00Z,0,0,14010.6,0,,',
  '0x6029424b26feFfe2879E88C62e8130dC418e64D9,6a36b897-b38d-4938-9537-32a5ee4f33b8,52000,2024-03-10T00:00:00Z,2028-03-10T00:00:00Z,2029-03-10T00:00:00Z,2025-03-10T00:00:00Z,2025-09-10T00:00:00Z,13000,19500,5200,10400,2026-09-10T00:00:00Z,ALL',
].join('\r\n');

const sandbox = sinon.createSandbox();

describe('vesting task', () => {
  afterEach(() => {
    sandbox.restore();
  });
  describe('validation', () => {
    describe('isWithinFiveYears', () => {
      describe('pass', () => {
        // it('should return true if within five years', () => {
        //   expect(validation.isWithinFiveYears.test(moment().unix())).to.be.true;
        // });
      });
      describe('fail', () => {
        it('should return false if not within five years', () => {
          expect(
            validation.isWithinFiveYears.test(
              moment().add(5, 'years').add(1, 'day').unix()
            )
          ).to.be.false;
        });
      });
    });
  });
  1647572003;
  describe('grantSchema', () => {
    describe('validation', () => {
      describe('valid', () => {
        it('should return true for a valid grant schema', async () => {
          const grant = {
            '0xDD66B46910918B2F442D6b75C6E55631ad678c99': {
              recipient: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
              originalAmount: formatTokenString('0'),
              startTime: formatEthereumTime('0'),
              vestEndTime: formatEthereumTime('0'),
              unlockEndTime: formatEthereumTime('0'),
              cliff1Time: formatEthereumTime('0'),
              cliff2Time: formatEthereumTime('0'),
              vestCliff1Amount: formatTokenString('0'),
              vestCliff2Amount: formatTokenString('0'),
              unlockCliff1Amount: formatTokenString('0'),
              unlockCliff2Amount: formatTokenString('0'),
              lastRevocationTime: 0,
              lastQuantityRevoked: formatTokenString('0'),
            },
          };
          expect(await grantSchema.validate(grant)).to.deep.eq(grant);
        });
      });
      // describe('invalid', () => {
      //   // todo
      // });
      // it('should return true for a valid grant schema', async () => {
      //   await expect(grantSchema.validate({ recipient: 1 })).to.become({}); // todo fails, expect obj
      // });
      describe('schema paths', () => {
        describe('recipient', () => {
          // describe('valid', () => {
          //   it("should pass when the recipient is a valid ethereum address with the same value as the parent object's key", async () => {});
          // });
          describe('invalid', () => {
            // it('string', async () => {})
            // it('defined', async () => {})
            // it('isWalletAddress', async () => {})
            it("should fail when the recipient is not the same value as the parent object's key", async () => {
              const grant = {
                '0xDD66B46910918B2F442D6b75C6E55631ad678c99': {
                  recipient: '0x465d5a3fFeA4CD109043499Fa576c3E16f918463',
                  originalAmount: formatTokenString('0'),
                  startTime: formatEthereumTime('0'),
                  vestEndTime: formatEthereumTime('0'),
                  unlockEndTime: formatEthereumTime('0'),
                  cliff1Time: formatEthereumTime('0'),
                  cliff2Time: formatEthereumTime('0'),
                  vestCliff1Amount: formatTokenString('0'),
                  vestCliff2Amount: formatTokenString('0'),
                  unlockCliff1Amount: formatTokenString('0'),
                  unlockCliff2Amount: formatTokenString('0'),
                  lastRevocationTime: 0,
                  lastQuantityRevoked: formatTokenString('0'),
                },
              };
              await expect(grantSchema.validate(grant)).rejectedWith(
                validation.isWalletAddress.message({
                  path: '0xDD66B46910918B2F442D6b75C6E55631ad678c99.recipient',
                })
              ); // todo fails, expect obj
            });
          });
        });
      });
    });
  });
  describe('flags', () => {
    describe('diff', () => {
      it('should list vesting schedules', async () => {
        const { hre } = await setupTestEnvironment();
        sandbox.stub(hre, 'log');
        const fake = sandbox.fake.returns({
          rest: {
            repos: {
              getContent: () => {
                return {
                  data: MOCK_GITHUB_VESTING_DATA,
                };
              },
            },
          },
        } as Partial<typeof Octokit> as Octokit);
        sandbox.replace(github, 'getOctokit', fake);
        await hre.run('vesting', {
          diff: true,
          asJson: true,
        });
        expect(hre.log).to.have.been.calledWith({
          '0xDD66B46910918B2F442D6b75C6E55631ad678c99': {
            originalAmount: {
              __old: '0',
              __new: '46425588600000000000000',
            },
            startTime: { __old: 0, __new: 1657756800 },
            vestEndTime: { __old: 0, __new: 1783987200 },
            unlockEndTime: { __old: 0, __new: 1815523200 },
            cliff1Time: { __old: 0, __new: 1689292800 },
            cliff2Time: { __old: 0, __new: 1705190400 },
            vestCliff1Amount: {
              __old: '0',
              __new: '11606397150000000000000',
            },
            vestCliff2Amount: {
              __old: '0',
              __new: '17409595730000000000000',
            },
            unlockCliff1Amount: {
              __old: '0',
              __new: '4642558860000000000000',
            },
            unlockCliff2Amount: {
              __old: '0',
              __new: '9285117720000000000000',
            },
          },
          '0x465d5a3fFeA4CD109043499Fa576c3E16f918463': {
            originalAmount: {
              __old: '0',
              __new: '73000000000000000000000',
            },
            startTime: { __old: 0, __new: 1 },
            unlockEndTime: { __old: 0, __new: 1689292800 },
            cliff1Time: { __old: 0, __new: 1689292800 },
            cliff2Time: { __old: 0, __new: 1689292800 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '73000000000000000000000',
            },
          },
          '0x3254678253467832548762382348765342765342': {
            originalAmount: { __old: '0', __new: '120000000000000000000' },
            startTime: { __old: 0, __new: 1 },
            unlockEndTime: { __old: 0, __new: 1689292800 },
            cliff1Time: { __old: 0, __new: 1689292800 },
            cliff2Time: { __old: 0, __new: 1689292800 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '120000000000000000000',
            },
          },
          '0x8eB185e20A9B7b31bd48DA19E834B93bE952795E': {
            originalAmount: {
              __old: '0',
              __new: '6454545000000000000000000',
            },
            startTime: { __old: 0, __new: 1 },
            unlockEndTime: { __old: 0, __new: 1783987200 },
            cliff1Time: { __old: 0, __new: 1689292800 },
            cliff2Time: { __old: 0, __new: 1705190400 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '806818125000000000000000',
            },
            unlockCliff2Amount: {
              __old: '0',
              __new: '1613636250000000000000000',
            },
          },
          '0x6b9d03759E9F14a641f0703fBD84F1F726159B6B': {
            originalAmount: {
              __old: '0',
              __new: '20000000000000000000000000',
            },
            startTime: { __old: 0, __new: 1 },
            unlockEndTime: { __old: 0, __new: 1815523200 },
            cliff1Time: { __old: 0, __new: 1689292800 },
            cliff2Time: { __old: 0, __new: 1705190400 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '2000000000000000000000000',
            },
            unlockCliff2Amount: {
              __old: '0',
              __new: '4000000000000000000000000',
            },
          },
          '0xBd6E6A75c7A51cfdf08DDf2f538ceB221835839b': {
            originalAmount: {
              __old: '0',
              __new: '50000000000000000000000',
            },
            startTime: { __old: 0, __new: 1677801600 },
            vestEndTime: { __old: 0, __new: 1804032000 },
            unlockEndTime: { __old: 0, __new: 1835654400 },
            cliff1Time: { __old: 0, __new: 1709424000 },
            cliff2Time: { __old: 0, __new: 1725321600 },
            vestCliff1Amount: {
              __old: '0',
              __new: '12500000000000000000000',
            },
            vestCliff2Amount: {
              __old: '0',
              __new: '18750000000000000000000',
            },
            unlockCliff1Amount: {
              __old: '0',
              __new: '5000000000000000000000',
            },
            unlockCliff2Amount: {
              __old: '0',
              __new: '10000000000000000000000',
            },
          },
          '0x8aBFd8375DA1521E70d23988eb5a6efA799C15ea': {
            originalAmount: {
              __old: '0',
              __new: '14010600000000000000000',
            },
            startTime: { __old: 0, __new: 1 },
            unlockEndTime: { __old: 0, __new: 1854057600 },
            cliff1Time: { __old: 0, __new: 1854057600 },
            cliff2Time: { __old: 0, __new: 1854057600 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '14010600000000000000000',
            },
          },
          '0x6029424b26feFfe2879E88C62e8130dC418e64D9': {
            originalAmount: {
              __old: '0',
              __new: '52000000000000000000000',
            },
            startTime: { __old: 0, __new: 1710028800 },
            vestEndTime: { __old: 0, __new: 1836259200 },
            unlockEndTime: { __old: 0, __new: 1867795200 },
            cliff1Time: { __old: 0, __new: 1741564800 },
            cliff2Time: { __old: 0, __new: 1757462400 },
            vestCliff1Amount: {
              __old: '0',
              __new: '13000000000000000000000',
            },
            vestCliff2Amount: {
              __old: '0',
              __new: '19500000000000000000000',
            },
            unlockCliff1Amount: {
              __old: '0',
              __new: '5200000000000000000000',
            },
            unlockCliff2Amount: {
              __old: '0',
              __new: '10400000000000000000000',
            },
            lastRevocationTime: { __old: 0, __new: 1788998400 },
          },
        });
      });
    });
  });

  // describe('positional parameters', () => {
  //   describe('update', () => {
  //     it('should update vesting schedules', async () => {
  //       const { hre } = await setupTestEnvironment();
  //       sandbox.stub(hre, 'log');
  //       const fake = sandbox.fake.returns({
  //         rest: {
  //           repos: {
  //             getContent: () => {
  //               return {
  //                 data: MOCK_GITHUB_VESTING_DATA,
  //               };
  //             },
  //           },
  //         },
  //       } as Partial<typeof Octokit> as Octokit);
  //       sandbox.replace(github, 'getOctokit', fake);
  //       await hre.run('vesting', {});
  //       // todo check that vesting schedules were updated
  //     });
  //   });
  // });
});
