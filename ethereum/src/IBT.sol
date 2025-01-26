// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IBT is ERC20, Ownable {
    event BridgeInitiated(address indexed from, uint256 amount, string destinationChain, string destinationAddress);

    constructor() ERC20("Inter BlockChain Token", "IBT") Ownable(msg.sender) {}

    // minting if owner
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // burning if owner
    function burn(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
    }

    // initiate bridge
    function initiatebridge(uint256 amount, string calldata suiAddress) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // burn
        _burn(msg.sender, amount);

        // emit bridge
        emit BridgeInitiated(msg.sender, amount, "sui", suiAddress);
    }
}