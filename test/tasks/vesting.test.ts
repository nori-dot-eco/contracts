/* eslint-disable unicorn/no-await-expression-member */

import moment from 'moment';
import type { Octokit } from '@octokit/rest';

import type { LockedNORI } from '@/typechain-types';
import type { GrantList, ParsedGrants } from '@/tasks/vesting';
import {
  grantSchema,
  grantCsvToList,
  grantListToObject,
  grantsSchema,
  validations,
  rules,
} from '@/tasks/vesting';
import { utcToEvmTime } from '@/utils/units';
import * as github from '@/tasks/utils/github';
import * as contractUtils from '@/utils/contracts';
import { expect, setupTest, sinon } from '@/test/helpers'; // todo deprecate exported hardhat, use hre from @/utils

const MOCK_VESTING_HEADER = [
  'recipient',
  'contactUUID',
  'originalAmount',
  'startTime',
  'vestEndTime',
  'unlockEndTime',
  'cliff1Time',
  'cliff2Time',
  'vestCliff1Amount',
  'vestCliff2Amount',
  'unlockCliff1Amount',
  'unlockCliff2Amount',
  'lastRevocationTime',
  'lastQuantityRevoked',
];

const MOCK_GITHUB_VESTING_GRANTS = [
  [
    '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
    '4c728e75-0aef-42f6-8ee3-3a831734e048',
    '46425.5886',
    '2022-07-14T00:00:00Z',
    '2026-07-14T00:00:00Z',
    '2027-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2024-01-14T00:00:00Z',
    '11606.39715',
    '17409.59573',
    '4642.55886',
    '9285.11772',
    '',
    '',
  ],
  [
    '0x465d5a3fFeA4CD109043499Fa576c3E16f918463',
    'ecd76b5a-9188-49c6-b456-d49ed3a68e5e',
    '73000',
    '2022-07-14T00:00:00Z',
    '2022-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '0',
    '0',
    '73000',
    '0',
    '',
    '',
  ],

  [
    '0x3254678253467832548762382348765342765342',
    'e0507d82-9c5a-4eb2-853f-d73a97790fec',
    '120',
    '2022-07-14T00:00:00Z',
    '2022-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '0',
    '0',
    '120',
    '0',
    '',
    '',
  ],
  [
    '0x8eB185e20A9B7b31bd48DA19E834B93bE952795E',
    'fa116039-a696-473a-8be8-4d970e437421',
    '6454545',
    '2022-07-14T00:00:00Z',
    '2022-07-14T00:00:00Z',
    '2026-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2024-01-14T00:00:00Z',
    '0',
    '0',
    '806818.125',
    '1613636.25',
    '',
    '',
  ],
  [
    '0x6b9d03759E9F14a641f0703fBD84F1F726159B6B',
    'ac88ed0f-d4de-4538-a18b-ae6f4c6cfe00',
    '20000000',
    '2022-07-14T00:00:00Z',
    '2022-07-14T00:00:00Z',
    '2027-07-14T00:00:00Z',
    '2023-07-14T00:00:00Z',
    '2024-01-14T00:00:00Z',
    '0',
    '0',
    '2000000',
    '4000000',
    '',
    '',
  ],
  [
    '0xBd6E6A75c7A51cfdf08DDf2f538ceB221835839b',
    'daf2922b-c96d-442e-a267-e977758961f1',
    '50000',
    '2023-03-03T00:00:00Z',
    '2027-03-03T00:00:00Z',
    '2028-03-03T00:00:00Z',
    '2024-03-03T00:00:00Z',
    '2024-09-03T00:00:00Z',
    '12500',
    '18750',
    '5000',
    '10000',
    '',
    '',
  ],
  [
    '0x8aBFd8375DA1521E70d23988eb5a6efA799C15ea',
    '614dadfd-279a-4cb4-886d-32305a3b61e2',
    '14010.6',
    '2022-07-14T00:00:00Z',
    '2022-07-14T00:00:00Z',
    '2028-10-02T00:00:00Z',
    '2028-10-02T00:00:00Z',
    '2028-10-02T00:00:00Z',
    '0',
    '0',
    '14010.6',
    '0',
    '',
    '',
  ],
  [
    '0x6029424b26feFfe2879E88C62e8130dC418e64D9',
    '6a36b897-b38d-4938-9537-32a5ee4f33b8',
    '52000',
    '2023-03-10T00:00:00Z',
    '2028-03-10T00:00:00Z',
    '2029-03-10T00:00:00Z',
    '2025-03-10T00:00:00Z',
    '2025-09-10T00:00:00Z',
    '13000',
    '19500',
    '5200',
    '10400',
    '2026-09-10T00:00:00Z',
    'ALL',
  ],
];

const MOCK_GITHUB_VESTING_DATA = [
  MOCK_VESTING_HEADER,
  ...MOCK_GITHUB_VESTING_GRANTS,
];

const createTestGrants = async (
  { data = MOCK_GITHUB_VESTING_GRANTS }: { data: string[][] } = {
    data: MOCK_GITHUB_VESTING_GRANTS,
  }
): Promise<{ grants: ParsedGrants; grantList: GrantList }> => {
  const listOfGrants = await grantCsvToList({
    data: [MOCK_VESTING_HEADER, ...data.map((d) => d.join(','))].join('\r\n'),
  });
  const grants = grantListToObject({ listOfGrants });
  return { grants, grantList: Object.values(grants) };
};

const sandbox = sinon.createSandbox();

describe('vesting task', () => {
  // todo consider using it.foreach

  afterEach(() => {
    sandbox.restore();
  });

  describe('grantListToObject', () => {
    describe('pass', () => {
      it('should parse a list of grants into an object keyed by the wallet address of a grant recipient', () => {
        const grant = {
          recipient: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
        };
        expect(
          grantListToObject({
            listOfGrants: [grant] as unknown as GrantList,
          })
        ).to.deep.equal({
          [grant.recipient]: grant,
        });
      });
    });
    describe('fail', () => {
      it('should fail when there are duplicate addresses in the list of grants', () => {
        const grant = {
          recipient: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
        };
        expect(() =>
          grantListToObject({
            listOfGrants: [grant, grant] as unknown as GrantList,
          })
        ).to.throw('duplicate');
      });
    });
  });
  describe('rules', () => {
    describe('isTimeWithinReasonableDateRange', () => {
      describe('pass', () => {
        it('should return true if it is within a reasonable date range', () => {
          for (const { maxFutureYears, minimumPastYears } of [
            { maxFutureYears: 10, minimumPastYears: 2 },
          ]) {
            expect(
              rules
                .isTimeWithinReasonableDateRange({
                  maxFutureYears,
                  minimumPastYears,
                })
                .isValidSync(
                  utcToEvmTime(moment().add(maxFutureYears - 1, 'years'))
                )
            ).to.be.true;
            expect(
              rules
                .isTimeWithinReasonableDateRange({
                  maxFutureYears,
                  minimumPastYears,
                })
                .isValidSync(
                  utcToEvmTime(moment().subtract(minimumPastYears - 1, 'years'))
                )
            ).to.be.true;
          }
        });
      });
      describe('fail', () => {
        it('should return false if it is not within a reasonable date range', () => {
          for (const { maxFutureYears, minimumPastYears } of [
            { maxFutureYears: 10, minimumPastYears: 2 },
          ]) {
            expect(
              rules
                .isTimeWithinReasonableDateRange({
                  maxFutureYears,
                  minimumPastYears,
                })
                .isValidSync(
                  utcToEvmTime(
                    moment().add(maxFutureYears, 'years').add('1', 'day')
                  )
                )
            ).to.be.false;
            expect(
              rules
                .isTimeWithinReasonableDateRange({
                  maxFutureYears,
                  minimumPastYears,
                })
                .isValidSync(
                  utcToEvmTime(
                    moment()
                      .subtract(minimumPastYears, 'years')
                      .subtract('1', 'day')
                  )
                )
            ).to.be.false;
          }
        });
      });
    });
    describe('isWalletAddress', () => {
      describe('pass', () => {
        it('should return true if it passes isWalletAddress validation', () => {
          for (const v of ['0xDD66B46910918B2F442D6b75C6E55631ad678c99'])
            expect(rules.isWalletAddress().isValidSync(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should return false if it fails isWalletAddress validation', () => {
          for (const v of ['0x1234', 1234, [], {}])
            expect(rules.isWalletAddress().isValidSync(v)).to.be.false;
        });
      });
    });
    describe('requiredPositiveBigNumberString', () => {
      describe('pass', () => {
        it('should pass if the argument is a valid bignumber string', () => {
          for (const v of ['12345', '0'])
            expect(rules.requiredPositiveBigNumberString().isValidSync(v)).to.be
              .true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument is not a valid bignumber string', () => {
          for (const v of [
            '',
            '1.1',
            1.2,
            -1,
            -1.1,
            undefined,
            undefined,
            [],
            {},
            'abc',
          ])
            expect(rules.requiredPositiveBigNumberString().isValidSync(v)).to.be
              .false;
        });
      });
    });
    describe('requiredString', () => {
      describe('pass', () => {
        it('should pass if the argument passes requiredString validation', () => {
          for (const v of ['abc', '1', '-1', '1.1', '0'])
            expect(rules.requiredString().isValidSync(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument fails requiredString validation', () => {
          for (const v of [-1, 1.01, -1.01, '', {}, [], undefined, undefined])
            expect(rules.requiredString().isValidSync(v)).to.be.false;
        });
      });
    });
    describe('requiredPositiveInteger', () => {
      describe('pass', () => {
        it('should pass if the argument passes requiredPositiveInteger validation', () => {
          for (const v of [0, 1])
            expect(rules.requiredPositiveInteger().isValidSync(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument fails requiredPositiveInteger validation', () => {
          for (const v of [
            '-1',
            'abc',
            -1,
            1.01,
            -1.01,
            '',
            {},
            [],
            undefined,
            undefined,
          ])
            expect(rules.requiredPositiveInteger().isValidSync(v)).to.be.false;
        });
      });
    });
  });
  describe('validations', () => {
    describe('isValidEvmMoment', () => {
      describe('pass', () => {
        it('should pass if the argument passes isValidEvmMoment validation', () => {
          for (const v of [
            utcToEvmTime(moment()),
            utcToEvmTime('2022-03-21T20:45:29.496Z'),
            utcToEvmTime('2022-03-21'),
            1,
            0,
          ])
            expect(validations.isValidEvmMoment().test(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument fails isValidEvmMoment validation', () => {
          for (const v of [
            undefined,
            undefined,
            true,
            false,
            1.1,
            -1,
            -1.1,
            '1',
            '1.1',
            '-1',
            '-1.1',
            '',
            'a',
            '2022-13-21',
          ])
            expect(validations.isValidEvmMoment().test(v)).to.be.false;
        });
      });
    });
    describe('walletAddressIsSameAsParentKey', () => {
      describe('pass', () => {
        it('should pass if the argument passes walletAddressIsSameAsParentKey validation', () => {
          for (const { value, path } of [
            {
              value: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
              path: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
            },
          ])
            expect(
              validations.walletAddressIsSameAsParentKey().test(value, { path })
            ).to.be.true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument fails walletAddressIsSameAsParentKey validation', () => {
          for (const { value, path } of [
            {
              value: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
              path: '0x465d5a3fFeA4CD109043499Fa576c3E16f918463',
            },
          ])
            expect(
              validations.walletAddressIsSameAsParentKey().test(value, { path })
            ).to.be.false;
        });
      });
    });
    describe('isBigNumberish', () => {
      describe('pass', () => {
        it('should pass if the argument passes isBigNumberish validation', () => {
          for (const v of ['1', '-1', '0'])
            expect(validations.isBigNumberish().test(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should fail if the argument fails isBigNumberish validation', () => {
          for (const v of [
            'a',
            '-1.1',
            -1,
            1.1,
            -1.1,
            1,
            '',
            {},
            [],
            undefined,
            undefined,
          ])
            expect(validations.isBigNumberish().test(v)).to.be.false;
        });
      });
    });
    describe('isBeforeMaxYears', () => {
      describe('pass', () => {
        it('should return true if within 10 years', () => {
          const maxFutureYears = 10;
          expect(
            validations
              .isBeforeMaxYears({ maxFutureYears })
              .test(utcToEvmTime(moment().add(maxFutureYears - 1, 'years')))
          ).to.be.true;
        });
      });
      describe('fail', () => {
        it('should return false if not within 10 years', () => {
          const maxFutureYears = 10;
          expect(
            validations
              .isBeforeMaxYears({ maxFutureYears })
              .test(moment().add(maxFutureYears, 'years').add(1, 'day').unix())
          ).to.be.false;
        });
      });
    });
    describe('isAfterYearsAgo', () => {
      describe('pass', () => {
        it('should return true if value is within 2 year ago from today', () => {
          const minimumPastYears = 2;
          expect(
            validations
              .isAfterYearsAgo({ minimumPastYears })
              .test(
                utcToEvmTime(moment().subtract(minimumPastYears - 1, 'years'))
              )
          ).to.be.true;
        });
      });
      describe('fail', () => {
        it('should return false if value is not within 2 year ago from today', () => {
          const minimumPastYears = 2;
          expect(
            validations
              .isAfterYearsAgo({ minimumPastYears })
              .test(
                moment()
                  .subtract(minimumPastYears, 'years')
                  .subtract(1, 'day')
                  .unix()
              )
          ).to.be.false;
        });
      });
    });
    describe('isWalletAddress', () => {
      describe('pass', () => {
        it('should return true if it is a valid wallet address', () => {
          for (const v of ['0xDD66B46910918B2F442D6b75C6E55631ad678c99'])
            expect(validations.isWalletAddress().test(v)).to.be.true;
        });
      });
      describe('fail', () => {
        it('should return false if not a valid wallet address', () => {
          for (const v of ['0x1234', 1234, [], {}])
            expect(validations.isWalletAddress().test(v)).to.be.false;
        });
      });
    });
  });
  describe('grantSchema', () => {
    // describe('valid', () => {});
    // describe('invalid', () => {});
    describe('schema paths', () => {
      describe('unlockEndTime', () => {
        describe('valid', () => {
          it('should pass when unlockEndTime is defined', () => {
            for (const v of [utcToEvmTime(moment())])
              expect(
                grantSchema.validateSyncAt('unlockEndTime', {
                  unlockEndTime: v,
                  vestEndTime: v,
                  startTime: v,
                })
              ).to.eq(v);
          });
        });
        describe('invalid', () => {
          it('should fail when unlockEndTime is missing', () => {
            for (const v of [undefined, undefined])
              expect(() =>
                grantSchema.validateSyncAt('unlockEndTime', {
                  unlockEndTime: v,
                })
              ).throws('unlockEndTime is a required field');
          });
          it('should fail when unlockEndTime is not a uint', () => {
            for (const v of [{}, [], '', '1', '-1', 1.1, false, true])
              expect(() =>
                grantSchema.validateSyncAt('unlockEndTime', {
                  unlockEndTime: v,
                })
              ).throws(
                typeof v === 'number' && Number.isInteger(v)
                  ? 'unlockEndTime must be greater than or equal'
                  : `unlockEndTime must be ${
                      typeof v === 'number' && !Number.isInteger(v)
                        ? 'an integer'
                        : 'a `number`'
                    }`
              );
          });
          it('should fail when unlockEndTime is negative', () => {
            for (const v of [-1])
              expect(() =>
                grantSchema.validateSyncAt('unlockEndTime', {
                  unlockEndTime: v,
                })
              ).throws(
                'unlockEndTime must be a valid EVM timestamp. Value: -1.'
              );
          });
        });
      });
      describe('cliff1Time', () => {
        describe('valid', () => {
          it('should pass when cliff1Time is defined and >= startTime', () => {
            for (const v of [utcToEvmTime(moment())])
              expect(
                grantSchema.validateSyncAt('cliff1Time', {
                  cliff1Time: v,
                  startTime: v,
                })
              ).to.eq(v);
          });
        });
        describe('invalid', () => {
          it('should fail when cliff1Time is missing', () => {
            for (const v of [undefined, undefined])
              expect(() =>
                grantSchema.validateSyncAt('cliff1Time', { cliff1Time: v })
              ).throws('cliff1Time is a required field');
          });
          it('should fail when cliff1Time is not a uint', () => {
            for (const v of [{}, [], '', '1', '-1', 1.1, false, true])
              expect(() =>
                grantSchema.validateSyncAt('cliff1Time', { cliff1Time: v })
              ).throws(
                typeof v === 'number' && Number.isInteger(v)
                  ? 'cliff1Time must be greater than or equal'
                  : `cliff1Time must be ${
                      typeof v === 'number' && !Number.isInteger(v)
                        ? 'an integer'
                        : 'a `number`'
                    }`
              );
          });
        });
      });
      describe('cliff2Time', () => {
        describe('valid', () => {
          it('should pass when cliff2Time is defined and >= cliff1Time', () => {
            for (const v of [utcToEvmTime(moment())])
              expect(
                grantSchema.validateSyncAt('cliff2Time', {
                  cliff2Time: v,
                  cliff1Time: v,
                })
              ).to.eq(v);
          });
        });
        describe('invalid', () => {
          it('should fail when cliff2Time is missing', () => {
            for (const v of [undefined, undefined])
              expect(() =>
                grantSchema.validateSyncAt('cliff2Time', { cliff2Time: v })
              ).throws('cliff2Time is a required field');
          });
          it('should fail when cliff2Time is not a uint', () => {
            for (const v of [{}, [], '', '1', '-1', 1.1, false, true])
              expect(() =>
                grantSchema.validateSyncAt('cliff2Time', { cliff2Time: v })
              ).throws(
                typeof v === 'number' && Number.isInteger(v)
                  ? 'cliff2Time must be greater than or equal'
                  : `cliff2Time must be ${
                      typeof v === 'number' && !Number.isInteger(v)
                        ? 'an integer'
                        : 'a `number`'
                    }`
              );
          });
        });
      });
      describe('startTime', () => {
        describe('valid', () => {
          it('should pass when startTime is defined', () => {
            for (const v of [utcToEvmTime(moment())])
              expect(
                grantSchema.validateSyncAt('startTime', { startTime: v })
              ).to.eq(v);
          });
        });
        describe('invalid', () => {
          it('should fail when startTime is missing', () => {
            for (const v of [undefined, undefined])
              expect(() =>
                grantSchema.validateSyncAt('startTime', { startTime: v })
              ).throws('startTime is a required field');
          });
          it('should fail when startTime is not a uint', () => {
            for (const v of [{}, [], '', '1', '-1', -1, 1.1, false, true])
              expect(() =>
                grantSchema.validateSyncAt('startTime', { startTime: v })
              ).throws(
                typeof v === 'number' && Number.isInteger(v)
                  ? 'startTime must be greater than or equal'
                  : `startTime must be ${
                      typeof v === 'number' && !Number.isInteger(v)
                        ? 'an integer'
                        : 'a `number`'
                    }`
              );
          });
        });
      });
      describe('vestEndTime', () => {
        describe('valid', () => {
          it('should pass when vestEndTime is defined', () => {
            for (const v of [utcToEvmTime(moment())]) {
              console.log('vestEndTime1---', { v });
              expect(
                grantSchema.validateSyncAt('vestEndTime', { vestEndTime: v })
              ).to.eq(v);
            }
          });
        });
        describe('invalid', () => {
          it('should fail when vestEndTime is missing', () => {
            for (const v of [undefined, undefined])
              expect(() =>
                grantSchema.validateSyncAt('vestEndTime', { vestEndTime: v })
              ).throws('vestEndTime is a required field');
          });
          it('should fail when vestEndTime is not a positive uint', () => {
            for (const v of [{}, [], '', '1', '-1', -1, 1.1, false, true])
              expect(() =>
                grantSchema.validateSyncAt('vestEndTime', { vestEndTime: v })
              ).throws(
                typeof v === 'number' && Number.isInteger(v)
                  ? 'vestEndTime must be greater than or equal'
                  : `vestEndTime must be ${
                      typeof v === 'number' && !Number.isInteger(v)
                        ? 'an integer'
                        : 'a `number`'
                    }`
              );
          });
        });
      });
      describe('recipient', () => {
        // describe('valid', () => {
        //   it("should pass when the recipient is a valid ethereum address with the same value as the parent object's key", async () => {});
        // });
        describe('invalid', () => {
          it("should fail when the recipient is not the same value as the parent object's key", async () => {
            const data = MOCK_GITHUB_VESTING_GRANTS[0];
            const {
              grantList: [grant],
            } = await createTestGrants({
              data: [data],
            });
            const originalRecipient = grant.recipient;
            expect(grant.recipient).to.not.eq(MOCK_GITHUB_VESTING_GRANTS[1][0]);
            grant.recipient = MOCK_GITHUB_VESTING_GRANTS[1][0];
            // todo .each test known invalid variants
            await expect(
              grantsSchema.validate({ [originalRecipient]: grant })
            ).rejectedWith(
              validations.walletAddressIsSameAsParentKey().message({
                path: `${originalRecipient}.recipient`,
                value: MOCK_GITHUB_VESTING_GRANTS[1][0],
              })
            );
          });
        });
      });
    });
  });
  describe('grantsSchema', () => {
    describe('validation', () => {
      describe('valid', () => {
        it('should return true for a valid grant schema', async () => {
          // todo .each test known valid variants
          const { grants } = await createTestGrants();
          expect(await grantsSchema.validate(grants)).to.deep.eq(grants);
        });
      });
      // describe('invalid', () => {
      //   // todo
      // });
      // it('should return true for a valid grant schema', async () => {
      //   await expect(grantsSchema.validate({ recipient: 1 })).to.become({});
      // });
    });
  });
  describe('flags', () => {
    describe('dry-run', () => {
      it('should use callStatic', async () => {
        const { hre, lNori } = await setupTest();
        sandbox.replace(
          github,
          'getOctokit',
          sandbox.fake.returns({
            rest: {
              repos: {
                getContent: () => {
                  return {
                    data: MOCK_GITHUB_VESTING_DATA.join('\r\n'),
                  };
                },
              },
            },
          } as Partial<typeof Octokit> as Octokit)
        );
        const getLockedNORI = sandbox.fake.returns({
          ...lNori,
          batchRevokeUnvestedTokenAmounts: sandbox.spy(),
          batchCreateGrants: sandbox.spy(),
          callStatic: {
            ...lNori.callStatic,
            batchRevokeUnvestedTokenAmounts: sandbox.spy(),
            batchCreateGrants: sandbox.spy(),
          },
        } as DeepPartial<Promise<LockedNORI>> as Promise<LockedNORI>);
        sandbox.replace(contractUtils, 'getLockedNORI', getLockedNORI);
        await hre.run('vesting', {
          action: 'createAndRevoke',
          dryRun: true,
        });
        expect((await getLockedNORI()).callStatic.batchCreateGrants).calledOnce;
        expect(
          (await getLockedNORI()).callStatic.batchRevokeUnvestedTokenAmounts
        ).calledOnce;
        expect((await getLockedNORI()).batchCreateGrants).callCount(0);
        expect(
          (await getLockedNORI()).batchRevokeUnvestedTokenAmounts
        ).callCount(0);
      });
    });
    describe('diff', () => {
      it('should list vesting schedules', async () => {
        const { hre } = await setupTest();
        hre.log = sandbox.stub();
        const fake = sandbox.fake.returns({
          rest: {
            repos: {
              getContent: () => {
                return {
                  data: MOCK_GITHUB_VESTING_DATA.join('\r\n'),
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
            vestEndTime: { __old: 0, __new: 1_783_987_200 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: {
              __old: '0',
              __new: '46425588600000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_815_523_200 },
            cliff1Time: { __old: 0, __new: 1_689_292_800 },
            cliff2Time: { __old: 0, __new: 1_705_190_400 },
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
            vestEndTime: { __old: 0, __new: 1_657_756_800 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: {
              __old: '0',
              __new: '73000000000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_689_292_800 },
            cliff1Time: { __old: 0, __new: 1_689_292_800 },
            cliff2Time: { __old: 0, __new: 1_689_292_800 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '73000000000000000000000',
            },
          },
          '0x3254678253467832548762382348765342765342': {
            vestEndTime: { __old: 0, __new: 1_657_756_800 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: { __old: '0', __new: '120000000000000000000' },
            unlockEndTime: { __old: 0, __new: 1_689_292_800 },
            cliff1Time: { __old: 0, __new: 1_689_292_800 },
            cliff2Time: { __old: 0, __new: 1_689_292_800 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '120000000000000000000',
            },
          },
          '0x8eB185e20A9B7b31bd48DA19E834B93bE952795E': {
            vestEndTime: { __old: 0, __new: 1_657_756_800 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: {
              __old: '0',
              __new: '6454545000000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_783_987_200 },
            cliff1Time: { __old: 0, __new: 1_689_292_800 },
            cliff2Time: { __old: 0, __new: 1_705_190_400 },
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
            vestEndTime: { __old: 0, __new: 1_657_756_800 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: {
              __old: '0',
              __new: '20000000000000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_815_523_200 },
            cliff1Time: { __old: 0, __new: 1_689_292_800 },
            cliff2Time: { __old: 0, __new: 1_705_190_400 },
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
            vestEndTime: { __old: 0, __new: 1_804_032_000 },
            startTime: { __old: 0, __new: 1_677_801_600 },
            originalAmount: {
              __old: '0',
              __new: '50000000000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_835_654_400 },
            cliff1Time: { __old: 0, __new: 1_709_424_000 },
            cliff2Time: { __old: 0, __new: 1_725_321_600 },
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
            vestEndTime: { __old: 0, __new: 1_657_756_800 },
            startTime: { __old: 0, __new: 1_657_756_800 },
            originalAmount: {
              __old: '0',
              __new: '14010600000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_854_057_600 },
            cliff1Time: { __old: 0, __new: 1_854_057_600 },
            cliff2Time: { __old: 0, __new: 1_854_057_600 },
            unlockCliff1Amount: {
              __old: '0',
              __new: '14010600000000000000000',
            },
          },
          '0x6029424b26feFfe2879E88C62e8130dC418e64D9': {
            vestEndTime: { __old: 0, __new: 1_836_259_200 },
            startTime: { __old: 0, __new: 1_678_406_400 },
            originalAmount: {
              __old: '0',
              __new: '52000000000000000000000',
            },
            unlockEndTime: { __old: 0, __new: 1_867_795_200 },
            cliff1Time: { __old: 0, __new: 1_741_564_800 },
            cliff2Time: { __old: 0, __new: 1_757_462_400 },
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
            lastRevocationTime: { __old: 0, __new: 1_788_998_400 },
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
  //                 data: MOCK_GITHUB_VESTING_DATA.join('\r\n'),
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
