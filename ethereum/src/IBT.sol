// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IBT is ERC20, Ownable {
    event BridgeInitiated(address indexed from, uint256 amount, string destinationChain, string destinationAddress);

    constructor() ERC20("Inter BlockChain Token", "IBT") Ownable(msg.sender) {}

    // Mint tokens (only owner can mint)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Burn tokens (users can burn their own tokens)
    function burn(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
    }

    // Initiate bridge (users can bridge their own tokens)
    function initiatebridge(uint256 amount, string calldata suiAddress) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Burn the tokens from the user's account
        _burn(msg.sender, amount);

        // Emit bridge event
        emit BridgeInitiated(msg.sender, amount, "sui", suiAddress);
    }
}