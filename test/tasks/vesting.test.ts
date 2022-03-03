import { BigNumber } from 'ethers';

import * as github from '@/tasks/utils/github';
import { expect, setupTestEnvironment, sinon } from '@/test/helpers'; // todo deprecate exported hardhat, use hre from @/utils
import { hre } from '@/utils/hre';

const MOCK_GITHUB_VESTING_DATA = [
  'walletAddress,contactUUID,amount,startTime,vestEndTime,unlockEndTime,cliff1Time,cliff2Time,vestCliff1Amount,vestCliff2Amount,unlockCliff1Amount,unlockCliff2Amount,revokeUnvestedTime',
  '0xDD66B46910918B2F442D6b75C6E55631ad678c99,4c728e75-0aef-42f6-8ee3-3a831734e048,46425.5886,2022-07-14T00:00:00Z,2026-07-14T00:00:00Z,2027-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,11606.39715,17409.59573,4642.55886,9285.11772,',
  '0x13535205596c3eF9fCf53689da3B998e621a34C4,ecd76b5a-9188-49c6-b456-d49ed3a68e5e,73000,2022-07-14T00:00:00Z,,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,,,,73000,,',
  '0x3254678253467832548762382348765342765342,e0507d82-9c5a-4eb2-853f-d73a97790fec,120,2022-07-14T00:00:00Z,,2023-07-14T00:00:00Z,2023-07-14T00:00:00Z,,,,120,,',
  '0x6b89d62d4a06523ec54bec4B6a675816edCce06F,fa116039-a696-473a-8be8-4d970e437421,6454545,2022-07-14T00:00:00Z,,2026-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,,,806818.125,1613636.25,',
  '0xb9F77e8FE9AEf5df3A4C3c42359D88423e41F41a,ac88ed0f-d4de-4538-a18b-ae6f4c6cfe00,20000000,2022-07-14T00:00:00Z,,2027-07-14T00:00:00Z,2023-07-14T00:00:00Z,2024-01-14T00:00:00Z,,,2000000,4000000,',
  '0x33a28D7A0C94599e62470FCCe5dfa9D4c072314e,daf2922b-c96d-442e-a267-e977758961f1,50000,2023-03-03T00:00:00Z,2027-03-03T00:00:00Z,2028-03-03T00:00:00Z,2024-03-03T00:00:00Z,2024-09-03T00:00:00Z,12500,18750,5000,10000,',
  '0x7fc7D7B73262f5D57373072E82749eeE5B520E23,614dadfd-279a-4cb4-886d-32305a3b61e2,14010.6,2018-10-02T00:00:00Z,,2028-10-02T00:00:00Z,2028-10-02T00:00:00Z,,,,14010.6,,',
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F,6a36b897-b38d-4938-9537-32a5ee4f33b8,52000,2024-03-10T00:00:00Z,2028-03-10T00:00:00Z,2029-03-10T00:00:00Z,2025-03-10T00:00:00Z,2025-09-10T00:00:00Z,13000,19500,5200,10400,2026-09-10T00:00:00Z',
].join('\r\n');

describe('vesting task', () => {
  it('should list vesting schedules', async () => {
    const { sandbox } = await setupTestEnvironment();
    sandbox.stub(hre, 'log');
    const fake = sinon.fake.returns({
      rest: {
        repos: {
          getContent: () => {
            return {
              data: MOCK_GITHUB_VESTING_DATA,
            };
          },
        },
      },
    });

    sandbox.replace(github, 'getOctokit', fake as any);
    await hre.run('vesting', {
      list: true,
      commit: '362ff5766f3ce9792b7d6387647400898fe06276',
    });
    expect(hre.log).to.have.been.calledWith([
      {
        walletAddress: '0xDD66B46910918B2F442D6b75C6E55631ad678c99',
        contactUUID: '4c728e75-0aef-42f6-8ee3-3a831734e048',
        amount: BigNumber.from('46425588600000000000000'),
        startTime: '2022-07-14T00:00:00Z',
        vestEndTime: '2026-07-14T00:00:00Z',
        unlockEndTime: '2027-07-14T00:00:00Z',
        cliff1Time: '2023-07-14T00:00:00Z',
        cliff2Time: '2024-01-14T00:00:00Z',
        vestCliff1Amount: '11606.39715',
        vestCliff2Amount: '17409.59573',
        unlockCliff1Amount: '4642.55886',
        unlockCliff2Amount: '9285.11772',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0x13535205596c3eF9fCf53689da3B998e621a34C4',
        contactUUID: 'ecd76b5a-9188-49c6-b456-d49ed3a68e5e',
        amount: BigNumber.from('73000000000000000000000'),
        startTime: '2022-07-14T00:00:00Z',
        vestEndTime: '',
        unlockEndTime: '2023-07-14T00:00:00Z',
        cliff1Time: '2023-07-14T00:00:00Z',
        cliff2Time: '',
        vestCliff1Amount: '',
        vestCliff2Amount: '',
        unlockCliff1Amount: '73000',
        unlockCliff2Amount: '',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0x3254678253467832548762382348765342765342',
        contactUUID: 'e0507d82-9c5a-4eb2-853f-d73a97790fec',
        amount: BigNumber.from('120000000000000000000'),
        startTime: '2022-07-14T00:00:00Z',
        vestEndTime: '',
        unlockEndTime: '2023-07-14T00:00:00Z',
        cliff1Time: '2023-07-14T00:00:00Z',
        cliff2Time: '',
        vestCliff1Amount: '',
        vestCliff2Amount: '',
        unlockCliff1Amount: '120',
        unlockCliff2Amount: '',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0x6b89d62d4a06523ec54bec4B6a675816edCce06F',
        contactUUID: 'fa116039-a696-473a-8be8-4d970e437421',
        amount: BigNumber.from('6454545000000000000000000'),
        startTime: '2022-07-14T00:00:00Z',
        vestEndTime: '',
        unlockEndTime: '2026-07-14T00:00:00Z',
        cliff1Time: '2023-07-14T00:00:00Z',
        cliff2Time: '2024-01-14T00:00:00Z',
        vestCliff1Amount: '',
        vestCliff2Amount: '',
        unlockCliff1Amount: '806818.125',
        unlockCliff2Amount: '1613636.25',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0xb9F77e8FE9AEf5df3A4C3c42359D88423e41F41a',
        contactUUID: 'ac88ed0f-d4de-4538-a18b-ae6f4c6cfe00',
        amount: BigNumber.from('20000000000000000000000000'),
        startTime: '2022-07-14T00:00:00Z',
        vestEndTime: '',
        unlockEndTime: '2027-07-14T00:00:00Z',
        cliff1Time: '2023-07-14T00:00:00Z',
        cliff2Time: '2024-01-14T00:00:00Z',
        vestCliff1Amount: '',
        vestCliff2Amount: '',
        unlockCliff1Amount: '2000000',
        unlockCliff2Amount: '4000000',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0x33a28D7A0C94599e62470FCCe5dfa9D4c072314e',
        contactUUID: 'daf2922b-c96d-442e-a267-e977758961f1',
        amount: BigNumber.from('50000000000000000000000'),
        startTime: '2023-03-03T00:00:00Z',
        vestEndTime: '2027-03-03T00:00:00Z',
        unlockEndTime: '2028-03-03T00:00:00Z',
        cliff1Time: '2024-03-03T00:00:00Z',
        cliff2Time: '2024-09-03T00:00:00Z',
        vestCliff1Amount: '12500',
        vestCliff2Amount: '18750',
        unlockCliff1Amount: '5000',
        unlockCliff2Amount: '10000',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0x7fc7D7B73262f5D57373072E82749eeE5B520E23',
        contactUUID: '614dadfd-279a-4cb4-886d-32305a3b61e2',
        amount: BigNumber.from('14010600000000000000000'),
        startTime: '2018-10-02T00:00:00Z',
        vestEndTime: '',
        unlockEndTime: '2028-10-02T00:00:00Z',
        cliff1Time: '2028-10-02T00:00:00Z',
        cliff2Time: '',
        vestCliff1Amount: '',
        vestCliff2Amount: '',
        unlockCliff1Amount: '14010.6',
        unlockCliff2Amount: '',
        revokeUnvestedTime: '',
      },
      {
        walletAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        contactUUID: '6a36b897-b38d-4938-9537-32a5ee4f33b8',
        amount: BigNumber.from('52000000000000000000000'),
        startTime: '2024-03-10T00:00:00Z',
        vestEndTime: '2028-03-10T00:00:00Z',
        unlockEndTime: '2029-03-10T00:00:00Z',
        cliff1Time: '2025-03-10T00:00:00Z',
        cliff2Time: '2025-09-10T00:00:00Z',
        vestCliff1Amount: '13000',
        vestCliff2Amount: '19500',
        unlockCliff1Amount: '5200',
        unlockCliff2Amount: '10400',
        revokeUnvestedTime: '2026-09-10T00:00:00Z',
      },
    ]);
  });
});
