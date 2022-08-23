import path from 'path';

import { types, task } from 'hardhat/config';
import { AdminClient } from 'defender-admin-client';
import { readJsonSync } from 'fs-extra';
import { isDefenderNetwork } from './utils/defender';

const addAutotasksToDefenderAutotasks = async (
  {
    contractNames,
  }: {
    contractNames: (keyof Contracts)[];
  },
  hre: CustomHardHatRuntimeEnvironment
): Promise<void> => {
  // const deployed = readJsonSync(path.join(__dirname, '../contracts.json'));
  // const {
  //   config: { defender },
  //   network: { name: networkName },
  //   ethers,
  // } = hre;
  // if (defender !== undefined && isDefenderNetwork(networkName)) {
  //   hre.log('Adding contracts to defender');
  //   const contracts = await Promise.all(
  //     contractNames.map(async (name) => {
  //       const factory = await ethers.getContractFactory(name);
  //       const contract = await factory.attach(
  //         deployed[networkName][name].proxyAddress
  //       );
  //       return {
  //         name,
  //         abi: contract.interface.format(
  //           ethers.utils.FormatTypes.json
  //         ) as string,
  //         network: networkName,
  //         address: deployed[networkName][name].proxyAddress,
  //       };
  //     })
  //   );
  //   const defenderClient = new AdminClient(defender);
  //   const defenderContracts = new Set(
  //     (await defenderClient.listContracts()).map((c) =>
  //       c.name.concat(c.network)
  //     )
  //   );
  //   const contractsToAddToDefender: Parameters<
  //     typeof defenderClient['addContract']
  //   >[0][] = contracts.filter((c) => {
  //     return !defenderContracts.has(c.name.concat(c.network));
  //   });
  //   if (contractsToAddToDefender.length === 0) {
  //     hre.log('No contracts to add to defender');
  //   } else {
  //     await Promise.all(
  //       contractsToAddToDefender.map(async (c) => defenderClient.addContract(c))
  //     );
  //     hre.log(
  //       'Added the following contracts to defender:',
  //       contractsToAddToDefender.map((c) => c.name)
  //     );
  //   }
  // }
};

export const DEFENDER_AUTOTASKS_ADD_TASK = {
  name: 'defender-autotasks:add',
  description: 'Adds contracts to Defender Admin',
  run: addAutotasksToDefenderAutotasks,
} as const;

task(
  DEFENDER_AUTOTASKS_ADD_TASK.name,
  DEFENDER_AUTOTASKS_ADD_TASK.description,
  DEFENDER_AUTOTASKS_ADD_TASK.run
).addVariadicPositionalParam(
  'autotaskNames',
  'the list of autotasks to add',
  undefined,
  types.string
);
