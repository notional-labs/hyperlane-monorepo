import { ChainAddresses } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainName,
  HyperlaneCore,
  HyperlaneDeployer,
  HyperlaneDeploymentArtifacts,
  MultiProvider,
  buildAgentConfig,
  serializeContractsMap,
} from '@hyperlane-xyz/sdk';
import {
  ProtocolType,
  objFilter,
  objMap,
  objMerge,
  promiseObjAll,
} from '@hyperlane-xyz/utils';

import { Contexts } from '../../config/contexts.js';
import {
  Modules,
  getAddresses,
  getAgentConfig,
  getAgentConfigJsonPath,
  writeAddresses,
} from '../../scripts/agent-utils.js';
import { DeployEnvironment, envNameToAgentEnv } from '../config/environment.js';
import { getCosmosChainGasPrice } from '../config/gas-oracle.js';
import {
  chainIsProtocol,
  readJSONAtPath,
  writeJsonAtPath,
  writeMergedJSONAtPath,
} from '../utils/utils.js';

export async function deployWithArtifacts<Config extends object>(
  configMap: ChainMap<Config>,
  deployer: HyperlaneDeployer<Config, any>,
  cache: {
    verification: string;
    read: boolean;
    write: boolean;
    environment: DeployEnvironment;
    module: Modules;
  },
  targetNetwork?: ChainName,
  agentConfig?: {
    multiProvider: MultiProvider;
    environment: DeployEnvironment;
  },
) {
  if (cache.read) {
    const addressesMap = getAddresses(cache.environment, cache.module);
    deployer.cacheAddressesMap(addressesMap);
  }

  process.on('SIGINT', async () => {
    // Call the post deploy hook to write the addresses and verification
    await postDeploy(deployer, cache, agentConfig);

    console.log('\nCaught (Ctrl+C), gracefully exiting...');
    process.exit(0); // Exit the process
  });

  try {
    if (targetNetwork) {
      deployer.deployedContracts[targetNetwork] =
        await deployer.deployContracts(targetNetwork, configMap[targetNetwork]);
    } else {
      await deployer.deploy(configMap);
    }
  } catch (e) {
    console.error('Failed to deploy contracts', e);
  }

  await postDeploy(deployer, cache, agentConfig);
}

export async function postDeploy<Config extends object>(
  deployer: HyperlaneDeployer<Config, any>,
  cache: {
    verification: string;
    read: boolean;
    write: boolean;
    environment: DeployEnvironment;
    module: Modules;
  },
  agentConfig?: {
    multiProvider: MultiProvider;
    environment: DeployEnvironment;
  },
) {
  if (cache.write) {
    // TODO: dedupe deployedContracts with cachedAddresses
    const deployedAddresses = serializeContractsMap(deployer.deployedContracts);
    const cachedAddresses = deployer.cachedAddresses;
    const addresses = objMerge(deployedAddresses, cachedAddresses);

    // cache addresses of deployed contracts
    writeAddresses(cache.environment, cache.module, addresses);

    let savedVerification = {};
    try {
      savedVerification = readJSONAtPath(cache.verification);
    } catch (e) {
      console.error('Failed to load cached verification inputs');
    }

    // cache verification inputs
    const inputs =
      deployer.mergeWithExistingVerificationInputs(savedVerification);
    writeJsonAtPath(cache.verification, inputs);
  }
  if (agentConfig) {
    await writeAgentConfig(agentConfig.multiProvider, agentConfig.environment);
  }
}

export async function writeAgentConfig(
  multiProvider: MultiProvider,
  environment: DeployEnvironment,
) {
  const addresses = getAddresses(environment, Modules.CORE);
  const addressesForEnv = objFilter(
    addresses,
    (chain, _): _ is ChainAddresses => multiProvider.hasChain(chain),
  );

  const core = HyperlaneCore.fromAddressesMap(addressesForEnv, multiProvider);
  // Write agent config indexing from the deployed Mailbox which stores the block number at deployment
  const startBlocks = await promiseObjAll(
    objMap(addressesForEnv, async (chain, _) => {
      // If the index.from is specified in the chain metadata, use that.
      const indexFrom = multiProvider.getChainMetadata(chain).index?.from;
      if (indexFrom !== undefined) {
        return indexFrom;
      }

      const mailbox = core.getContracts(chain).mailbox;
      try {
        const deployedBlock = await mailbox.deployedBlock();
        return deployedBlock.toNumber();
      } catch (err) {
        console.error(
          'Failed to get deployed block, defaulting to 0. Chain:',
          chain,
          'Error:',
          err,
        );
        return 0;
      }
    }),
  );

  // Get gas prices for Cosmos chains.
  // Instead of iterating through `addresses`, which only includes EVM chains,
  // iterate through the environment chain names.
  const envAgentConfig = getAgentConfig(Contexts.Hyperlane, environment);
  const environmentChains = envAgentConfig.environmentChainNames;
  const additionalConfig = Object.fromEntries(
    await Promise.all(
      environmentChains
        .filter((chain) => chainIsProtocol(chain, ProtocolType.Cosmos))
        .map(async (chain) => [
          chain,
          {
            gasPrice: await getCosmosChainGasPrice(chain),
          },
        ]),
    ),
  );

  const agentConfig = buildAgentConfig(
    environmentChains,
    multiProvider,
    addressesForEnv as ChainMap<HyperlaneDeploymentArtifacts>,
    startBlocks,
    additionalConfig,
  );
  writeMergedJSONAtPath(
    getAgentConfigJsonPath(envNameToAgentEnv[environment]),
    agentConfig,
  );
}
