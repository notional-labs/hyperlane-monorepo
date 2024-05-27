// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.8.0;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "../contracts/token/HypERC20.sol";

contract DeployHypERC20 is Script {
    function run() external {
        vm.startBroadcast();
        HypERC20 hypERC20 = HypERC20(
            0x6301360802E31Ff5824cA90CaF183D4828644071
        );
        hypERC20.enrollRemoteRouter(
            1,
            bytes32(
                uint256(uint160(0x93840E9885C6DEdcc0e9f4440D3defE914b755C3))
            )
        );
        hypERC20.setDestinationGas(1, 64000);
        vm.stopBroadcast();
    }
}