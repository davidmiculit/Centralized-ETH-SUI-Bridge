export const CONTRACT_CONFIG = {
    ethereum: {
      address: import.meta.env.VITE_ETH_CONTRACT_ADDRESS,
      abi: [
        "function mint(address to, uint256 amount) external",
        "function burn(uint256 amount) external",
        "function balanceOf(address account) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function initiatebridge(uint256 amount, string calldata suiAddress) external"
      ],
    },
    sui: {
      packageId: import.meta.env.VITE_SUI_PACKAGE_ID,
      bridgeAuthId: import.meta.env.VITE_SUI_BRIDGE_AUTH_ID,
      module: 'IBT',
    },
  };