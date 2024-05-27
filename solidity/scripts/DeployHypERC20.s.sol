// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.8.0;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "../contracts/token/HypERC20.sol";

contract DeployHypERC20 is Script {
    function run() external {
        vm.startBroadcast();

        ProxyAdmin proxyAdmin = new ProxyAdmin();

        // Contructor
        uint8 decimals = 6;
        address mailbox = 0xAf49cC8Dc2c673F71c1E755fd63A2E2151C8DE2E;
        HypERC20 hypERC20Impl = new HypERC20(decimals, mailbox);
        TransparentUpgradeableProxy hypErc20Proxy = new TransparentUpgradeableProxy(
                address(hypERC20Impl),
                address(proxyAdmin),
                ""
            );

        uint256 totalSupply = 0;
        string memory name = "Tether USD";
        string memory symbol = "USDT";
        address hook = 0xE6e5cF8aF07FB0980FC36dE77C9DFfFcaa53EC31;
        address interchainSecurityModule = 0x620DA34aDCD41A40c76eEF652BC756a91d81AFC9;
        address owner = 0x34D42b0acdfa33cFCa6847B5280db425F1b75f74;
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
