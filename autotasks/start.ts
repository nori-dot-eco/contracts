import { AutotaskEvent } from 'defender-autotask-utils';
import { ethers } from 'ethers';
import {
  DefenderRelaySigner,
  DefenderRelayProvider,
} from 'defender-relay-client/lib/ethers';
import type { AutotaskRelayerParams } from 'defender-relay-client';
import { KeyValueStoreClient } from 'defender-kvstore-client';
import type { KeyValueStoreCreateParams } from 'defender-kvstore-client';
import * as contractsConfig from '@/contracts.json';
import * as BridgedPolygonNORI from '@/artifacts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json';

const MARKET_ADDRESS = contractsConfig.mumbai.Market.proxyAddress;
const BPNORI_ADDRESS = contractsConfig.mumbai.BridgedPolygonNORI.proxyAddress;
const BPNORI_ABI = BridgedPolygonNORI.abi;

type Body = {
  amount: number;
  buyerWalletAddress: string;
  graphqlEndpoint: string;
  apiSecret: string;
};


exports.handler = async function (event: AutotaskEvent & AutotaskRelayerParams & KeyValueStoreCreateParams) {
  const { amount, buyerWalletAddress, graphqlEndpoint, apiSecret } = event
    .request?.body as Body;
  if (apiSecret !== event.secrets?.apiSecret) {
    throw new Error('Invalid api secret');
  };
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(
    event as AutotaskRelayerParams,
    provider
  );
  const store = new KeyValueStoreClient(event);
  const contract = new ethers.Contract(BPNORI_ADDRESS, BPNORI_ABI, signer);
  const relayerAddress = await signer.getAddress();
  const { hash: transactionHash } = await contract.send(
    MARKET_ADDRESS,
    ethers.utils.parseUnits(amount.toString(), 18).toString(),
    ethers.utils.hexZeroPad(buyerWalletAddress || relayerAddress, 32),
    { gasLimit: '2000000' }
  );
  await store.put(transactionHash, graphqlEndpoint);
  return { transactionHash };
};
