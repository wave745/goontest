import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from '@/hooks/use-toast';

interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  walletAddress: string | null;
}

interface AuthenticationData {
  walletAddress: string;
  signedMessage: string;
  streamId: string;
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    walletAddress: null,
  });

  const authenticateForStream = useCallback(async (streamId: string): Promise<AuthenticationData | null> => {
    if (!connected || !publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your Solana wallet first",
        variant: "destructive",
      });
      return null;
    }

    setAuthState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const walletAddress = publicKey.toBase58();

      // Step 1: Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          streamId
        }),
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }

      const { nonce, expiresAt } = await nonceResponse.json();

      // Step 2: Create message to sign
      const message = `Authenticate for stream: ${streamId}\nNonce: ${nonce}\nTimestamp: ${expiresAt}`;
      const messageBytes = new TextEncoder().encode(message);

      // Step 3: Sign the message with wallet
      const signature = await signMessage(messageBytes);
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      setAuthState({
        isAuthenticated: true,
        isAuthenticating: false,
        walletAddress,
      });

      toast({
        title: "Authentication successful",
        description: "Your wallet has been authenticated for streaming",
      });

      return {
        walletAddress,
        signedMessage: signatureBase64,
        streamId
      };

    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthState(prev => ({ ...prev, isAuthenticating: false }));
      
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      
      return null;
    }
  }, [connected, publicKey, signMessage]);

  const claimStream = useCallback(async (postId: string, authData: AuthenticationData): Promise<any> => {
    try {
      const claimResponse = await fetch(`/api/posts/${postId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: authData.walletAddress,
          signedMessage: authData.signedMessage
        }),
      });

      if (!claimResponse.ok) {
        const error = await claimResponse.json();
        throw new Error(error.error || 'Failed to claim stream ownership');
      }

      return await claimResponse.json();
    } catch (error) {
      console.error('Stream claiming failed:', error);
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      isAuthenticating: false,
      walletAddress: null,
    });
  }, []);

  return {
    ...authState,
    authenticateForStream,
    claimStream,
    reset,
    isWalletConnected: connected,
    walletAddress: publicKey?.toBase58() || null,
  };
}