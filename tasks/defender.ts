import path from 'path';

import { types, task } from 'hardhat/config';
import { AdminClient } from 'defender-admin-client';
import type { Network } from 'defender-base-client/lib/utils/network';
import { readJsonSync } from 'fs-extra';

const isDefenderNetwork = (network: string): network is Network => {
  return [
    'mainnet',
    'ropsten',
    'rinkeby',
    'kovan',
    'goerli',
    'xdai',
    'sokol',
    'fuse',
    'bsc',
    'bsctest',
    'fantom',
    'fantomtest',
    'moonbase',
    'matic',
    'mumbai',
  ].includes(network);
};

const addContractsToDefender = async (
  {
    contractNames,
  }: {
    contractNames: ContractNames[];
  },
  hre: CustomHardHatRuntimeEnvironment
): Promise<void> => {
  const deployed = readJsonSync(path.join(__dirname, '../contracts.json'));
  const {
    config: { defender },
    network: { name: networkName },
    ethers,
  } = hre;
  if (defender && isDefenderNetwork(networkName)) {
    console.log('Adding contracts to defender');
    const contracts = await Promise.all(
      contractNames.map(async (name) => {
        const factory = await ethers.getContractFactory(name);
        const contract = await factory.attach(
          deployed[networkName][name].proxyAddress
        );
        return {
          name,
          abi: contract.interface.format(
            ethers.utils.FormatTypes.json
          ) as string,
          network: networkName,
          address: deployed[networkName][name].proxyAddress,
        };
      })
    );
    const defenderClient = new AdminClient(defender);
    const defenderContracts = (await defenderClient.listContracts()).map((c) =>
      c.name.concat(c.network)
    );
    const contractsToAddToDefender: Parameters<
      typeof defenderClient['addContract']
    >[0][] = contracts.filter((c) => {
      return !defenderContracts.includes(c.name.concat(c.network));
    });
    if (contractsToAddToDefender.length === 0) {
      console.log('No contracts to add to defender');
    } else {
      await Promise.all(
        contractsToAddToDefender.map(async (c) => defenderClient.addContract(c))
      );
      console.log(
        'Added the following contracts to defender:',
        contractsToAddToDefender.map((c) => c.name)
      );
    }
  }
};

export const DEFENDER_ADD_TASK = {
  name: 'defender:add',
  description: 'Adds contracts to defender',
  run: addContractsToDefender,
} as const;

task(DEFENDER_ADD_TASK.name, DEFENDER_ADD_TASK.description, DEFENDER_ADD_TASK.run).addVariadicPositionalParam(
  'contractNames',
  'the list of contracts to add',
  undefined,
  types.string
);
