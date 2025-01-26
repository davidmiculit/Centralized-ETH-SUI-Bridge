import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallets, useSuiClient} from '@mysten/dapp-kit';
import { BCS, getSuiMoveConfig } from "@mysten/bcs";
import { Transaction } from '@mysten/sui/transactions';
import { Wallet } from 'lucide-react';
import { CONTRACT_CONFIG } from '../contracts/contractConfig';
import './BridgeContent.css';

const BridgeContent = () => {
  const [ethConnected, setEthConnected] = useState(false);
  const [ethAddress, setEthAddress] = useState('');
  const [ethBalance, setEthBalance] = useState('0');
  const [suiBalance, setSuiBalance] = useState('0');
  const [suiCoinBalance, setSuiCoinBalance] = useState('0');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [status, setStatus] = useState('');
  const [amount, setAmount] = useState('');
  const [availableCoins, setAvailableCoins] = useState([]);

  const wallets = useWallets();
  const suiClient = useSuiClient();

  useEffect(() => {
    if (ethAddress) updateEthBalance(ethAddress);
    if (selectedWallet && selectedWallet.accounts[0]) {
      updateSuiBalance(selectedWallet.accounts[0].address);
      updateSuiCoinBalance(selectedWallet.accounts[0].address);
      fetchAndSelectCoin(selectedWallet.accounts[0].address);
    }
  }, [ethAddress, selectedWallet, status]);

  useEffect(() => {
    console.log('Available Coins:', availableCoins);
  }, [availableCoins]);

  const connectEthWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setEthAddress(accounts[0]);
      setEthConnected(true);
      await updateEthBalance(accounts[0]);
      setStatus('Ethereum wallet connected successfully!');
    } catch (error) {
      setStatus('Error connecting Ethereum wallet: ' + error.message);
    }
  };

  const updateEthBalance = async (address) => {
    if (window.ethereum && address) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_CONFIG.ethereum.address,
          CONTRACT_CONFIG.ethereum.abi,
          signer
        );
        const balance = await contract.balanceOf(address);
        setEthBalance(ethers.formatUnits(balance, 18));
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
        setStatus('Error fetching ETH balance: ' + error.message);
      }
    }
  };

  const connectSuiWallet = async (wallet) => {
    try {
      const features = wallet.features['standard:connect'];
      if (features) {
        await features.connect();
        setSelectedWallet(wallet);
        if (wallet.accounts[0]) {
          console.log('Connected Sui Address:', wallet.accounts[0].address);
          await updateSuiBalance(wallet.accounts[0].address);
          await updateSuiCoinBalance(wallet.accounts[0].address);
          await fetchAndSelectCoin(wallet.accounts[0].address);
        }
        setStatus('Sui wallet connected successfully!');
      }
    } catch (error) {
      setStatus('Error connecting Sui wallet: ' + error.message);
    }
  };

  const updateSuiBalance = async (address) => {
    if (selectedWallet && address) {
      try {
        const coins = await suiClient.getCoins({
          owner: address,
          coinType: `${CONTRACT_CONFIG.sui.packageId}::${CONTRACT_CONFIG.sui.module}::IBT`,
        });

        const totalBalance = coins.data.reduce((acc, coin) => acc + BigInt(coin.balance), 0n);
        const displayBalance = (Number(totalBalance) / 1_000_000_000).toFixed(9);
        console.log(`Raw Balance: ${totalBalance.toString()}, Display Balance: ${displayBalance}`);
        setSuiBalance(displayBalance);
      } catch (error) {
        console.error('Error fetching SUI balance:', error);
        setSuiBalance('0');
      }
    }
  };

  const updateSuiCoinBalance = async (address) => {
    if (selectedWallet && address) {
      try {
        const coins = await suiClient.getCoins({ owner: address });
        const totalBalance = coins.data.reduce((acc, coin) => acc + BigInt(coin.balance), 0n);
        const displayBalance = Number(totalBalance) / 1_000_000_000;
        setSuiCoinBalance(displayBalance.toString());
      } catch (error) {
        console.error('Error fetching SUI coin balance:', error);
        setSuiCoinBalance('0');
      }
    }
  };

  const fetchAndSelectCoin = async (address) => {
    try {
      console.log('Fetching coins for address:', address);
      const coinType = `${CONTRACT_CONFIG.sui.packageId}::${CONTRACT_CONFIG.sui.module}::IBT`;
      console.log('Using coinType:', coinType);

      const coins = await suiClient.getCoins({
        owner: address,
        coinType,
      });

      console.log('Fetched coins:', coins.data);

      if (coins.data.length > 0) {
        setAvailableCoins(coins.data);
        setSelectedCoinId(coins.data[0].coinObjectId);
      } else {
        setStatus('No SUI Coin<IBT> objects available for bridging.');
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      setStatus('Error fetching coins: ' + error.message);
    }
  };

  const validateSelectedCoin = async (coinId, userAddress) => {
    try {
      const coinObject = await suiClient.getObject({
        id: coinId,
        options: { showType: true, showOwner: true },
      });

      console.log('Coin Object:', coinObject);
      console.log('Coin Owner:', coinObject.data.owner);
      console.log('User Address:', userAddress);

      if (coinObject.error) {
        throw new Error(`Error fetching coin object: ${coinObject.error.message}`);
      }

      const expectedType = `0x2::coin::Coin<${CONTRACT_CONFIG.sui.packageId}::IBT::IBT>`;
      if (coinObject.data.type !== expectedType) {
        throw new Error(`Selected coin is not a valid Coin<IBT>. Expected: ${expectedType}, Got: ${coinObject.data.type}`);
      }

      const coinOwnerAddress = coinObject.data.owner.AddressOwner;
      if (coinOwnerAddress !== userAddress) {
        throw new Error(`Selected coin is not owned by the user. Coin Owner: ${coinOwnerAddress}, User Address: ${userAddress}`);
      }

      return true;
    } catch (error) {
      console.error('Error validating selected coin:', error);
      throw error;
    }
  };

  const serializeEthAddress = (address) => {
    const ethAddressBytes = ethers.getBytes(ethers.getAddress(address)); // eth address to a 20-byte Uint8Array
  
    // length byte + addr
    const serializedEthAddress = new Uint8Array(21);
    serializedEthAddress[0] = 20;
    serializedEthAddress.set(ethAddressBytes, 1);
  
    return serializedEthAddress;
  };

  const serializeAddress = (address) => {
    const cleanAddress = address.startsWith("0x") ? address.slice(2) : address; // remove "0x" prefix

    // sui addr to a Uint8Array
    const addressBytes = new Uint8Array(cleanAddress.length / 2);
    for (let i = 0; i < cleanAddress.length; i += 2) {
      addressBytes[i / 2] = parseInt(cleanAddress.substr(i, 2), 16);
    }

    // sui addr is 32 bytes
    if (addressBytes.length !== 32) {
      throw new Error("Invalid Sui address length. Expected 32 bytes.");
    }

    return addressBytes;
  };

  const handleBridge = async (fromEth) => {
    try {
      const bcs = new BCS(getSuiMoveConfig());

      if (fromEth) {
        // ETH to SUI bridging

        if (!ethConnected || !ethAddress) {
          throw new Error("Ethereum wallet not connected.");
        }

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
          throw new Error("Invalid amount.");
        }

        console.log("Bridging from Ethereum to Sui...");
        console.log("Ethereum Address:", ethAddress);
        console.log("Amount to Bridge:", amount);

        // burning
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_CONFIG.ethereum.address,
          CONTRACT_CONFIG.ethereum.abi,
          signer
        );

        // converting amount (ETH - 18 decimals)
        const amountWei = ethers.parseUnits(amount, 18);
        
        console.log("Amount in Wei:", amountWei.toString());
        const ethBalanceWei = await contract.balanceOf(ethAddress);
        if (BigInt(amountWei) > BigInt(ethBalanceWei)) {
          throw new Error("Insufficient Ethereum balance.");
        }

        console.log("Burning tokens on Ethereum...");
        const tx = await contract.burn(amountWei);
        console.log("Ethereum Burn Transaction:", tx);

        await tx.wait();
        console.log("Tokens burned on Ethereum. Now minting on Sui...");
        setStatus("Tokens burned on Ethereum. Now minting on Sui...");

        const txBlock = new Transaction();

        // gas budget
        txBlock.setGasBudget(10_000_000_000);
        console.log("Set Gas Budget:", 10_000_000_000);

        const amountSui = BigInt(amount);
        console.log("Amount for Sui (no decimals):", amountSui.toString());

        // serializing amount
        const serializedAmount = bcs.ser('u64', amountSui).toBytes();
        console.log("Serialized Amount (u64):", serializedAmount);

        // recipient sui addr
        const recipientAddress = selectedWallet.accounts[0].address;
        console.log("Recipient Address (Sui):", recipientAddress);

        // serializing sui addr
        const serializedRecipientAddress = serializeAddress(recipientAddress);
        console.log("Serialized Recipient Address (vector<u8>):", serializedRecipientAddress);

        console.log("BridgeAuthId:", CONTRACT_CONFIG.sui.bridgeAuthId);
        console.log("Serialized Amount (u64):", serializedAmount);
        console.log("Serialized Recipient Address (address):", serializedRecipientAddress);

        // minting
        txBlock.moveCall({
          target: `${CONTRACT_CONFIG.sui.packageId}::${CONTRACT_CONFIG.sui.module}::mint`,
          arguments: [
            txBlock.object(CONTRACT_CONFIG.sui.bridgeAuthId),
            txBlock.pure(serializedAmount, "u64"),
            txBlock.pure(serializedRecipientAddress, "address"),
          ],
        });

        console.log("Sui Transaction Block:", txBlock);

        const features = selectedWallet.features["sui:signAndExecuteTransactionBlock"];
        if (!features) throw new Error("Wallet doesn't support transaction signing");

        console.log("Signing and executing Sui transaction block...");
        const response = await features.signAndExecuteTransactionBlock({
          transactionBlock: txBlock,
        });

        console.log("Full Transaction Response:", JSON.stringify(response, null, 2));

        if (!response || !response.effects) {
          throw new Error("Invalid response from Sui transaction");
        }

        if (response.effects.status && response.effects.status.status === "failure") {
          throw new Error(`Transaction failed: ${response.effects.status.error}`);
        }

        setStatus("Tokens minted on Sui successfully!");
      } else {
        // SUI to ETH bridging
        if (!selectedWallet || !selectedWallet.accounts[0]) {
          throw new Error("Sui wallet not connected.");
        }

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
          throw new Error("Invalid amount.");
        }

        console.log("Bridging from Sui to Ethereum...");
        console.log("Sui Address:", selectedWallet.accounts[0].address);
        console.log("Amount to Bridge:", amount);

        const userAddress = selectedWallet.accounts[0].address;
        console.log("Validating selected coin...");
        await validateSelectedCoin(selectedCoinId, userAddress);

        const txBlock = new Transaction();

        // gas budget
        txBlock.setGasBudget(1_000_000_000);
        console.log("Set Gas Budget:", 1_000_000_000);

        // serializing ETH address (20 bytes)
        const serializedEthAddress = serializeEthAddress(ethAddress);
        console.log("Ethereum Address Bytes (vector<u8>):", serializedEthAddress);
        console.log("Length:", serializedEthAddress.length);

        const amountSui = BigInt(amount);
        console.log("Amount for Sui (no decimals):", amountSui.toString());

        // serializing amount
        const serializedAmount = bcs.ser('u64', amountSui).toBytes();
        console.log("Serialized Amount (u64):", serializedAmount);

        console.log("BridgeAuthId:", CONTRACT_CONFIG.sui.bridgeAuthId);
        console.log("Selected Coin ID:", selectedCoinId);
        console.log("Ethereum Address (bytes):", serializedEthAddress);

        // burn and bridge
        txBlock.moveCall({
          target: `${CONTRACT_CONFIG.sui.packageId}::${CONTRACT_CONFIG.sui.module}::burn_and_bridge`,
          arguments: [
            txBlock.object(CONTRACT_CONFIG.sui.bridgeAuthId),
            txBlock.object(selectedCoinId), 
            txBlock.pure(serializedEthAddress, "vector<u8>"),
            txBlock.pure(serializedAmount, "u64"),
          ],
        });

        console.log("Sui Transaction Block:", txBlock);

        const features = selectedWallet.features["sui:signAndExecuteTransactionBlock"];
        if (!features) throw new Error("Wallet doesn't support transaction signing");

        console.log("Signing and executing Sui transaction block...");
        const response = await features.signAndExecuteTransactionBlock({
          transactionBlock: txBlock,
        });

        console.log("Full Transaction Response:", JSON.stringify(response, null, 2));

        if (!response || !response.effects) {
          throw new Error("Invalid response from Sui transaction");
        }

        if (response.effects.status && response.effects.status.status === "failure") {
          throw new Error(`Transaction failed: ${response.effects.status.error}`);
        }

        setStatus("Tokens burned on Sui. Now minting on Ethereum...");

        // minting
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_CONFIG.ethereum.address,
          CONTRACT_CONFIG.ethereum.abi,
          signer
        );

        const amountWei = ethers.parseUnits(amount, 18);
        console.log("Amount in Wei:", amountWei.toString());

        console.log("Minting tokens on Ethereum...");
        const tx = await contract.mint(ethAddress, amountWei);
        console.log("Ethereum Mint Transaction:", tx);

        await tx.wait();
        console.log("Tokens minted on Ethereum successfully!");
        setStatus("Tokens minted on Ethereum successfully!");
      }
    } catch (error) {
      console.error("Error during bridging:", error);
      setStatus("Error during bridging: " + error.message);
    }
  };

  return (
    <div className="bridge-container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Wallet Connection</h2>
        </div>
        <div className="card-content">
          <div className="grid">
            {!ethConnected && (
              <button className="button-primary" onClick={connectEthWallet}>
                <Wallet className="icon" />
                Connect Ethereum
              </button>
            )}

            {!selectedWallet && (
              <div className="wallet-list">
                <div className="wallet-list-title">Available SUI Wallets:</div>
                {wallets.length === 0 ? (
                  <div className="alert">
                    <p>No SUI wallets installed</p>
                  </div>
                ) : (
                  <div className="wallet-buttons">
                    {wallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        className="wallet-button"
                        onClick={() => connectSuiWallet(wallet)}
                      >
                        <img src={wallet.icon} alt={`${wallet.name} icon`} className="wallet-icon" />
                        <span className="wallet-name">{wallet.name}</span>
                        <span className="wallet-version">v{wallet.version}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {(ethConnected || selectedWallet) && (
            <div className="wallet-info">
              {ethConnected && (
                <div className="wallet-detail">
                  <span>Ethereum</span>
                  <span className="wallet-address">
                    {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)} ({ethBalance} ETH)
                  </span>
                </div>
              )}
              {selectedWallet && selectedWallet.accounts[0] && (
                <>
                  <div className="wallet-detail">
                    <span>Sui (IBT)</span>
                    <span className="wallet-address">
                      {selectedWallet.accounts[0].address.slice(0, 6)}...
                      {selectedWallet.accounts[0].address.slice(-4)} ({suiBalance} IBT)
                    </span>
                  </div>
                  <div className="wallet-detail">
                    <span>Sui (Gas)</span>
                    <span className="wallet-address">
                      {selectedWallet.accounts[0].address.slice(0, 6)}...
                      {selectedWallet.accounts[0].address.slice(-4)} ({suiCoinBalance} SUI)
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {status && (
            <div className="alert">
              <p>{status}</p>
            </div>
          )}

          <div className="bridge-actions">
            {selectedWallet && selectedWallet.accounts[0] && (
              <select value={selectedCoinId} onChange={(e) => setSelectedCoinId(e.target.value)}>
                {availableCoins.length > 0 ? (
                  availableCoins.map((coin) => (
                    <option key={coin.coinObjectId} value={coin.coinObjectId}>
                      {`${Number(coin.balance) / 1_000_000_000} IBT (ID: ${coin.coinObjectId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No SUI Tokens available
                  </option>
                )}
              </select>
            )}
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to bridge"
            />
            <div className="bridge-buttons">
              <button className="button-primary" onClick={() => handleBridge(true)}>
                Bridge from Ethereum to Sui
              </button>
              <button className="button-primary" onClick={() => handleBridge(false)}>
                Bridge from Sui to Ethereum
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BridgeContent;