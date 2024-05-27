import { RpcConsensusType } from '@hyperlane-xyz/sdk';

import {
  HelloWorldConfig,
  HelloWorldKathyRunMode,
} from '../../../src/config/helloworld/types.js';
import { Contexts } from '../../contexts.js';

import { environment, ethereumChainNames } from './chains.js';
import hyperlaneAddresses from './helloworld/hyperlane/addresses.json';
import rcAddresses from './helloworld/rc/addresses.json';

export const hyperlaneHelloworld: HelloWorldConfig = {
  addresses: hyperlaneAddresses,
  kathy: {
    docker: {
      repo: 'gcr.io/abacus-labs-dev/hyperlane-monorepo',
      tag: 'b22a0f4-20240523-140812',
    },
    chainsToSkip: [],
    runEnv: environment,
    namespace: environment,
    runConfig: {
      mode: HelloWorldKathyRunMode.Service,
      fullCycleTime: 1000 * 60 * 60 * 24 * 2, // 2 days, 6 * 5 = 30 permutations, so ~1.5 hours per permutation
    },
    messageSendTimeout: 1000 * 60 * 10, // 10 min
    messageReceiptTimeout: 1000 * 60 * 20, // 20 min
    connectionType: RpcConsensusType.Fallback,
  },
};

export const releaseCandidateHelloworld: HelloWorldConfig = {
  addresses: rcAddresses,
  kathy: {
    docker: {
      repo: 'gcr.io/abacus-labs-dev/hyperlane-monorepo',
      tag: 'b22a0f4-20240523-140812',
    },
    chainsToSkip: [],
    runEnv: environment,
    namespace: environment,
    runConfig: {
      mode: HelloWorldKathyRunMode.CycleOnce,
    },
    messageSendTimeout: 1000 * 60 * 8, // 8 min
    messageReceiptTimeout: 1000 * 60 * 20, // 20 min
    connectionType: RpcConsensusType.Fallback,
  },
};

export const helloWorld = {
  [Contexts.Hyperlane]: hyperlaneHelloworld,
  [Contexts.ReleaseCandidate]: releaseCandidateHelloworld,
};
