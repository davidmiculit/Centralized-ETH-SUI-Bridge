import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { WalletProvider } from '@mysten/dapp-kit';

const queryClient = new QueryClient();

const networks = {
  devnet: { url: 'https://fullnode.devnet.sui.io:443' },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="devnet">
        <WalletProvider>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);