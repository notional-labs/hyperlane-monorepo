// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.8.0;

import "forge-std/Script.sol";

contract DeployHypERC20 is Script {
    function run() external {
        deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        proxyAdmin = new ProxyAdmin();

        // Contructor
        uint8 decimals = 8;
        address mailbox = address(1);
        HypERC20 hypERC20Impl = new HypERC20(8, mailbox);
        TransparentUpgradeableProxy hypErc20Proxy = new TransparentUpgradeableProxy(
                address(hypERC20Impl),
                address(proxyAdmin),
                ""
            );

        // Initialize params
        uint256 totalSupply = 1_000_000_0000;
        string name = "Test Name";
        string symbol = "NAME";
        address hook = address(2);
        address interchainSecurityModule = address(3);
        address owner = address(4);
        (bool success, ) = address(hypErc20Proxy).call(
            abi.encodeWithSelector(
                HypERC20.initialize.selector,
                totalSupply,
                name,
                symbol,
                hook,
                interchainSecurityModule,
                owner
            )
        );

        require(success, "Failed to initialize HypERC20");
        console.log("HypERC20 Implementation: ", address(hypERC20Impl));

        vm.stopBroadcast();
    }
}
