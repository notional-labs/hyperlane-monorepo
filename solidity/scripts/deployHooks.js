const {
  contractAt,
  sendTxn,
  deployContract,
  deployContractWithProxy,
  readTmpAddresses,
} = require('./shared/helpers');
const axios = require('axios');

// const RPC = "https://testnet.rpc.gobob.xyz/"
const RPC = 'https://rpc.sepolia.org';
async function main() {
  const owner = '0xD227Ed60eEE10c535Ac2878E0e29C1F8541529fA';
  const beneficiary = '0xD227Ed60eEE10c535Ac2878E0e29C1F8541529fA';

  // // BOB Testnet
  // const destinationChainID = 1;
  // const merkleTreeHook = '0xC4fa1cd4C2eA72A85BCF470E8676E476cE9ec546'
  // const staticAggregationHookFactoryAddress = '0xAcFc3aBA907Ddd4b3D521eCF2AA784320913e985';
  // const mailBoxAddress = '0x17D96Fb09Ddb21bd86d03514E4694329F9EB3f9E';

  // // BOB Testnet
  const destinationChainID = 111;
  const merkleTreeHook = '0x954F2bD430e1e0A852D85EAF1Dd43ebc128EBA51';
  const staticAggregationHookFactoryAddress =
    '0x160C28C92cA453570aD7C031972b58d5Dd128F72';
  const mailBoxAddress = '0x08461a059EFE3193916Cd21f77E9f01ceF1E4c7c';

  // IPG hook
  // Deploy StorageGasOracle and set remote gas configuration
  const storageGasOracle = await deployContract('StorageGasOracle', []);
  const remoteGasConfigs = [
    {
      remoteDomain: destinationChainID, // Must change
      tokenExchangeRate: 76825206103, // Must change
      gasPrice: 20000000000, // Must change
    },
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
