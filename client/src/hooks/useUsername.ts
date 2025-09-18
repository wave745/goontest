import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';

const ANON_USERNAME_KEY = 'goonhub_anon_username';

export function useUsername() {
  const { connected, publicKey } = useWallet();
  const [anonUsername, setAnonUsername] = useState<string | null>(null);

  // Load anonymous username from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ANON_USERNAME_KEY);
    setAnonUsername(stored);
  }, []);

  const setAnonymousUsername = (username: string) => {
    localStorage.setItem(ANON_USERNAME_KEY, username);
    setAnonUsername(username);
  };

  const clearAnonymousUsername = () => {
    localStorage.removeItem(ANON_USERNAME_KEY);
    setAnonUsername(null);
  };

  const getDisplayName = () => {
    if (connected && publicKey) {
      // When connected, use first 4 chars of wallet address
      return publicKey.toString().slice(0, 4);
    }
    // When disconnected, use anonymous username or fallback to "Anonymous"
    return anonUsername || "Anonymous";
  };

  // Sanitize display name to prevent HTML injection
  const sanitizeDisplayName = (name: string) => {
    return name.replace(/[<>&"']/g, (char) => {
      const htmlEntities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return htmlEntities[char] || char;
    });
  };

  const getUserAvatar = (seed?: string) => {
    const displayName = getDisplayName();
    const avatarSeed = seed || displayName;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
  };

  const isConnected = connected;
  const address = publicKey?.toString();
  const hasCustomUsername = !!anonUsername && !connected;
  
  return {
    displayName: sanitizeDisplayName(getDisplayName()),
    username: sanitizeDisplayName(getDisplayName()), // Keep for backward compatibility
    isConnected,
    address,
    anonUsername,
    hasCustomUsername,
    setAnonymousUsername,
    clearAnonymousUsername,
    getUserAvatar
  };
}