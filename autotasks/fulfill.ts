import { GraphQLClient, gql } from 'graphql-request';
import { KeyValueStoreClient } from 'defender-kvstore-client';
import type { KeyValueStoreCreateParams } from 'defender-kvstore-client';
import { AutotaskEvent, SentinelTriggerEvent } from 'defender-autotask-utils';

exports.handler = async function (
  event: AutotaskEvent & KeyValueStoreCreateParams
) {
  const store = new KeyValueStoreClient(event);
  try {
    const match = event.request?.body as SentinelTriggerEvent;
    const transactionHash = match.hash;
    const graphqlEndpoint = await store.get(transactionHash);
    const graphQLClient = new GraphQLClient(
      graphqlEndpoint || 'https://staging.nori.com/graphql'
    );
    const mutation = gql`
      mutation FillTokenOrder($orderTransactionHash: String!) {
        fillTokenOrder(orderTransactionHash: $orderTransactionHash) {
          id
        }
      }
    `;
    const variables = {
      orderTransactionHash: transactionHash,
    };
    await graphQLClient.request(mutation, variables);
    await store.del(transactionHash);
    return true;
  } catch (error) {
    console.error('Error performing autotask:', error);
    return undefined;
  }
};
