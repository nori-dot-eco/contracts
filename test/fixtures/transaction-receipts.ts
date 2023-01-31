/* eslint-disable unicorn/no-null -- this file contains fixture matching real on-chain data */

import { ethers } from 'ethers';

/**
 * A fixture that matches the transaction receipt of a real `swap` transaction on the Mumbai testnet.
 *
 * @see https://mumbai.polygonscan.com/tx/0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7
 */
export const marketSwapTransactionReceipt: ethers.providers.TransactionReceipt =
  {
    to: '0x61A9d9A34Dbc3a1accD55D684A2bF0e0D394201f',
    from: '0x6Dc772F80495F47d8000530A59eE975B67B7c646',
    // @ts-expect-error -- the ethers type is invalid as the value is indeed null
    contractAddress: null,
    transactionIndex: 2,
    gasUsed: ethers.BigNumber.from({ type: 'BigNumber', hex: '0x04c475' }),
    logsBloom:
      '0x4000000000000000000000000000000000000000000000000000040000000400000000000020000002000000000000002000801000000000040004004024200100000000000000008000000800100080000000000000000000010000000000400000000002000000000000000000480008000000080000008000001400100000c000000000000000000020800000000000001000000080000000000000000100220000800200000000000000000000020000000000000000000000000000004000000006000000000001000000000000000400000008000000100040000020000010000000000000000000000004000000100000000000000000880002120000',
    blockHash:
      '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
    transactionHash:
      '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
    logs: [
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        logIndex: 8,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0x897e46a477305b86F96b86671AD514E090D61A62',
        topics: [
          '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000008eb185e20a9b7b31bd48da19e834b93be952795e',
        ],
        data: '0x00000000000000000000000000000000000000000000000000000000499602d20000000000000000000000000000000000000000000000000608a87aa1d26f4d',
        logIndex: 9,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x00000000000000000000000000000000000000000000000007d80e39059190b3',
        logIndex: 10,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x000000000000000000000000897e46a477305b86f96b86671ad514e090d61a62',
        ],
        data: '0x0000000000000000000000000000000000000000000000000608a87aa1d26f4d',
        logIndex: 11,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000000608a87aa1d26f4f',
        logIndex: 12,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x000000000000000000000000677c15a51fbea299679e6d824eb5c3da0923b4ae',
        ],
        data: '0x00000000000000000000000000000000000000000000000001cf65be63bf2164',
        logIndex: 13,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000000000000000000001',
        logIndex: 14,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x0000000000000000000000008eb185e20a9b7b31bd48da19e834b93be952795e',
        ],
        data: '0x0000000000000000000000000000000000000000000000000608a87aa1d26f4e',
        logIndex: 15,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0x8d1fd3bDF29B5F5A98b196725ef0D00DD45eFa5a',
        topics: [
          '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x00000000000000000000000096107d037594cca4e7ce68f87346957bd726b3ee',
        ],
        data: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001001007e35553415a8eb185e20a9b7b31bd48da19e834b93be952795e0000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000c1150f543a4de9b',
        logIndex: 16,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0x96107D037594Cca4E7ce68f87346957BD726b3EE',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000000000000000000000000000000000000000002c8',
        ],
        data: '0x',
        logIndex: 17,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0x96107D037594Cca4E7ce68f87346957BD726b3EE',
        topics: [
          '0x71b93f608484eca5c0ce34cf649c43ec993a234dffbf78fd29d711fb47fd023c',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x00000000000000000000000000000000000000000000000000000000000002c8',
        ],
        data: '0x0000000000000000000000008d1fd3bdf29b5f5a98b196725ef0d00dd45efa5a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001001007e35553415a8eb185e20a9b7b31bd48da19e834b93be952795e0000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000c1150f543a4de9b',
        logIndex: 18,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
      {
        transactionIndex: 2,
        blockNumber: 31608942,
        transactionHash:
          '0x83848fc4a9f8c161ec4dfadaf7456b42a0eba1e94d133f7f28a903cc29b6e7c2',
        address: '0x0000000000000000000000000000000000001010',
        topics: [
          '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63',
          '0x0000000000000000000000000000000000000000000000000000000000001010',
          '0x0000000000000000000000006dc772f80495f47d8000530a59ee975b67b7c646',
          '0x000000000000000000000000be188d6641e8b680743a4815dfa0f6208038960f',
        ],
        data: '0x00000000000000000000000000000000000000000000000000214ccb3bfd9c0000000000000000000000000000000000000000000000001715fca1c2e69e6dee00000000000000000000000000000000000000000000297271b3e0d06071cd4a00000000000000000000000000000000000000000000001715db54f7aaa0d1ee00000000000000000000000000000000000000000000297271d52d9b9c6f694a',
        logIndex: 19,
        blockHash:
          '0x0af5ef43f894b960104db3c5120f88aa21a26f0a76d327228670fd60a7afd868',
      },
    ] as ethers.providers.Log[],
    blockNumber: 31608942,
    confirmations: 1717,
    cumulativeGasUsed: ethers.BigNumber.from({
      type: 'BigNumber',
      hex: '0x079c9e',
    }),
    effectiveGasPrice: ethers.BigNumber.from({
      type: 'BigNumber',
      hex: '0x06fc23ac0f',
    }),
    status: 1,
    type: 2,
    byzantium: true,
  };
