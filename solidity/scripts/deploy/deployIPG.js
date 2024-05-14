const { deployContract, contractAt, sendTxn } = require('../shared/helpers');
const { deployContractWithProxy } = require('../shared/helpers.js');
async function main() {
  // Deploy StorageGasOracle and set remote gas configuration
  const storageGasOracle = await deployContract('StorageGasOracle', []);
  const remoteGasConfigs = [
    {
      remoteDomain: 123, // Must change
      tokenExchangeRate: 100, // Must change
      gasPrice: 100, // Must change
    },
  ];
  await sendTxn(
    storageGasOracle.setRemoteGasDataConfigs(remoteGasConfigs),
    'storageGasOracle.setRemoteGasDataConfigs',
  );

  // Deploy InternalStorageGasOracle and set destination gas configuration
  const owner = '0x5a9D9ac43670568f6C466e7913b36e460BB4F219'; // Must change
  const beneficiary = '0x5a9D9ac43670568f6C466e7913b36e460BB4F219'; // Must change
  const interchainGasPaymaster = await deployContractWithProxy(
    'InterchainGasPaymaster',
    [owner, beneficiary],
  );
  const destinationGasConfig = [
    {
      remoteDomain: 123, // Must change
      config: {
        gasOracle: storageGasOracle.address,
        gasOverhead: 10000, // Must change
      },
    },
  ];
  await sendTxn(
    interchainGasPaymaster.setDestinationGasConfigs(destinationGasConfigs),
    'interchainGasPaymaster.setDestinationGasConfigs',
  );

  // Call Deploy function from StaticAggregationHookFactory with values is the IPG contract and another hook contract that existed
  const staticAggregationHookFactoryAddress =
    '0x5a9D9ac43670568f6C466e7913b36e460BB4F219'; // Must change
  const staticAggregationHookFactory = await contractAt(
    'StaticAggregationHookFactory',
    staticAggregationHookFactoryAddress,
  );
  const listHooks = [
    interchainGasPaymaster.address,
    '0x5a9D9ac43670568f6C466e7913b36e460BB4F219', // Must change and add more hooks
  ];
  await sendTxn(
    staticAggregationHookFactory.deploy(listHooks),
    'staticAggregationHookFactory.deploy',
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
