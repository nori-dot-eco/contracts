/* eslint-disable no-await-in-loop -- we want to run promise in sequence here */
import { task } from 'hardhat/config';

/**
 * Interact with the upgradeable proxy contracts.
 *
 * @param taskArguments - The upgradeable contract names
 * @param hre - The hardhat runtime environment.
 */
export const TASK = {
  name: 'upgrade',
  description: 'Interact with upgradeable contracts',
  run: async (
    {
      contractNames,
      validate,
    }: { contractNames: (keyof Contracts)[]; validate: boolean },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    if (validate) {
      const [signer] = await hre.getSigners();
      for (const name of contractNames) {
        const proxy = await hre.deployments.get(name);
        const newImplementation = await hre.ethers.getContractFactory(
          name,
          signer
        );
        await hre.upgrades.validateUpgrade(proxy, newImplementation, {
          unsafeAllow: ['delegatecall'],
        });
      }
    } else {
      hre.log('Skipping validation. No other options available yet.');
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addFlag('validate')
  .addVariadicPositionalParam(
    'contractNames',
    'The upgradeable contract names',
    undefined,
    undefined,
    false
  );
