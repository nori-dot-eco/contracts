import { MaxUint256 } from '../constants/units';
import { formatTokenAmount } from '../utils/units';

import type { Market } from '@/typechain-types';
import { getContract } from '@/utils/contracts';
import { expect } from '@/test/helpers';
import { BridgedPolygonNORI } from '../typechain-types/contracts';

describe('TEMPORARY AREA FOR SIMULATOR TESTS', () => {
  it('SIMULATOR Reverts', async () => {
    const admin = hre.namedSigners.admin;

    const bpNori = await getContract({
      contractName: 'BridgedPolygonNORI',
      hre,
    });
    const market = await getContract({
      contractName: 'Market',
      hre,
    });
    const value = await market.calculateCheckoutTotal(formatTokenAmount(1));
    const { v, r, s } = await admin.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    const simulatedTx = (await ((market as any).simulate as Market).swap(
      admin.address,
      formatTokenAmount(10),
      MaxUint256,
      v,
      r,
      s
    )) as any as {
      simulation: { data: any };
    };
    console.log({
      txInfo: simulatedTx.simulation.data.transaction.transaction_info,
      error:
        simulatedTx.simulation.data.transaction.transaction_info.stack_trace,
    });
    expect(simulatedTx.simulation.data.transaction.transaction_info.logs).to.not
      .be.undefined;
  });

  it('SIMULATOR Success', async () => {
    const admin = hre.namedSigners.admin;
    const removal = await getContract({
      contractName: 'Removal',
      hre,
    });
    const bpNori = await getContract({
      contractName: 'BridgedPolygonNORI',
      hre,
    });
    const market = await getContract({
      contractName: 'Market',
      hre,
    });
    const certificate = await getContract({
      contractName: 'Certificate',
      hre,
    });
    const rNori = await getContract({
      contractName: 'RestrictedNORI',
      hre,
    });
    const value = await market.calculateCheckoutTotal(formatTokenAmount(1));
    const { v, r, s } = await admin.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    const simulatedTx = (await ((market as any).simulate as Market).swap(
      admin.address,
      value,
      MaxUint256,
      v,
      r,
      s
    )) as any as {
      simulation: { data: any };
    };
    console.log({
      txInfo: simulatedTx.simulation.data.transaction.transaction_info,
    });
    for (const log of simulatedTx.simulation.data.transaction.transaction_info
      .logs) {
      if (log.raw.address.toLowerCase() === market.address.toLowerCase()) {
        const logs = market.interface.parseLog(log.market);
        console.log({ MARKET_LOG: logs });
      } else if (
        log.raw.address.toLowerCase() === removal.address.toLowerCase()
      ) {
        const logs = removal.interface.parseLog(log.raw);
        console.log({ REMOVAL_LOG: logs });
      } else if (
        log.raw.address.toLowerCase() === bpNori.address.toLowerCase()
      ) {
        const logs = bpNori.interface.parseLog(log.raw);
        console.log({ BRIDGED_POLYGON_NORI_LOG: logs });
      } else if (
        log.raw.address.toLowerCase() === certificate.address.toLowerCase()
      ) {
        const logs = certificate.interface.parseLog(log.raw);
        console.log({ CERTIFICATE_LOG: logs });
      } else if (
        log.raw.address.toLowerCase() === rNori.address.toLowerCase()
      ) {
        const logs = rNori.interface.parseLog(log.raw);
        console.log({ RESTRICTED_NORI_LOG: logs });
      }
    }
    expect(simulatedTx.simulation.data.transaction.transaction_info.logs).to.not
      .be.undefined;
  });
});
