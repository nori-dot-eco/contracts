import path from 'path';

import hre from 'hardhat';
import marmite from '@primitivefi/hardhat-marmite';
import { readJsonSync } from 'fs-extra';

const main = async () => {
  await marmite(hre, async (flag) => {
    const NORI = await hre.ethers.getContractFactory('NORI');
    const config = readJsonSync(path.join(__dirname, '../contracts.json'), {
      throws: false,
    });
    const nori = await NORI.attach(config[hre.network.name].NORI.proxyAddress);
    const tx = await nori.pause();
    await flag('pause', tx);
  });
};

main();
