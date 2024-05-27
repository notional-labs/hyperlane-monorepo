const {
  contractAt,
  sendTxn,
  deployContract,
  deployContractWithProxy,
  readTmpAddresses,
} = require('./shared/helpers');
const axios = require('axios');

const RPC = 'https://rpc.gobob.xyz/';
async function main() {
  const owner = '0x34D42b0acdfa33cFCa6847B5280db425F1b75f74';
  const beneficiary = '0x34D42b0acdfa33cFCa6847B5280db425F1b75f74';

  // BOB
  const destinationChainID = 1;
  const merkleTreeHook = '0xac049982f277C8e3138987dB55B30b2b7571c975';
  const staticAggregationHookFactoryAddress =
    '0xc4b65038Fb9574893f9277DFa8040640De7960E4';
  const mailBoxAddress = '0xAf49cC8Dc2c673F71c1E755fd63A2E2151C8DE2E';

  // // // ETH
  // const destinationChainID = 60808;
  // const merkleTreeHook = '0x48e6c30B97748d1e2e03bf3e9FbE3890ca5f8CCA';
  // const staticAggregationHookFactoryAddress =
  //   '0x6D2555A8ba483CcF4409C39013F5e9a3285D3C9E';
  // const mailBoxAddress = '0xc005dc82818d67AF737725bD4bf75435d065D239';

  // IPG hook
  // Deploy StorageGasOracle and set remote gas configuration
  const storageGasOracle = await deployContract('StorageGasOracle', []);
  const remoteGasConfigs = [
    // Another chain to ETH
    {
      remoteDomain: destinationChainID, // Must change
      tokenExchangeRate: 15000000000, // Must change
      gasPrice: 20000000000, // Must change
    },
    // // // ETH to another chain
    // {
    //   remoteDomain: destinationChainID, // Must change
    //   tokenExchangeRate: 15000000000, // Must change
    //   gasPrice: 1623532813, // Must change
    // },
  ];
  await sendTxn(
    storageGasOracle.setRemoteGasDataConfigs(remoteGasConfigs),
    'storageGasOracle.setRemoteGasDataConfigs',
  );

  // const {StorageGasOracle} = await readTmpAddresses()
  // const storageGasOracle = await contractAt("StorageGasOracle",StorageGasOracle)

  // Deploy InternalStorageGasOracle and set destination gas configuration
  const interchainGasPaymaster = await deployContractWithProxy(
    'InterchainGasPaymaster',
    [owner, beneficiary],
  );
  const destinationGasConfig = [
    {
      remoteDomain: destinationChainID,
      config: {
        gasOracle: storageGasOracle.address,
        gasOverhead: 166887,
      },
    },
  ];
  await sendTxn(
    interchainGasPaymaster.setDestinationGasConfigs(destinationGasConfig),
    'interchainGasPaymaster.setDestinationGasConfigs',
  );

  // const {PausableHook, InterchainGasPaymaster, FallbackDomainRoutingHook} = await readTmpAddresses()
  // const interchainGasPaymaster = await contractAt("InterchainGasPaymaster",InterchainGasPaymaster)
  // const pausableHook = await contractAt("PausableHook", PausableHook)
  // const fallbackRoutingHook = await contractAt("FallbackDomainRoutingHook", FallbackDomainRoutingHook)
  const pausableHook = await deployContract('PausableHook', []);
  const mailbox = await contractAt('Mailbox', mailBoxAddress);
  const fallbackRoutingHook = await deployContract(
    'FallbackDomainRoutingHook',
    [mailbox.address, owner, merkleTreeHook],
  );
  await sendTxn(
    mailbox.setDefaultHook(fallbackRoutingHook.address),
    'mailBox.setDefaultHook',
  );

  // Call Deploy function from StaticAggregationHookFactory with values is the IPG contract and another hook contract that existed
  const aggregationHookFactory = await contractAt(
    'StaticAggregationHookFactory',
    staticAggregationHookFactoryAddress,
  );
  console.log('Sending aggregationHookFactory.deploy');
  const tx = await aggregationHookFactory['deploy(address[],uint8)'](
    [interchainGasPaymaster.address, merkleTreeHook, pausableHook.address],
    3,
  );
  const receipt = await tx.wait();
  console.log('Transaction sent: ' + receipt.transactionHash);
  const deployedContract = await getDeployedContract(tx.hash);

  const setHookTx = await fallbackRoutingHook['setHook(uint32,address)'](
    destinationChainID,
    deployedContract,
  );
  console.log('Sending fallbackRoutingHook.setHook');
  const setHookReceipt = await setHookTx.wait();
  console.log('Transaction sent: ' + setHookReceipt.transactionHash);
}
async function getDeployedContract(txHash) {
  const request = {
    jsonrpc: '2.0',
    method: 'debug_traceTransaction',
    params: [
      txHash,
      {
        tracer: 'callTracer',
      },
    ],
    id: 1,
  };

  try {
    const response = await axios.post(RPC, request);
    const cleanedOutput = response.data.result.output.replace(/^0x/, '');
    const trimmedOutput = cleanedOutput.replace(/^0+/, '');
    const paddedOutput = trimmedOutput.padStart(40, '0');
    return '0x' + paddedOutput;
  } catch (error) {
    console.error('Error making JSON-RPC request:', error);
    throw error;
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
