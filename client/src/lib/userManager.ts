// User identification and goon username management
export interface GoonUser {
  id: string;
  goon_username: string;
  solana_address?: string;
  created_at?: string;
  last_active?: string;
}

const API_BASE = 'http://localhost:5000/api';

// Generate a unique goon username
export function generateGoonUsername(): string {
  const adjectives = [
    'Wild', 'Crazy', 'Epic', 'Savage', 'Bold', 'Fierce', 'Mystic', 'Cosmic',
    'Neon', 'Cyber', 'Quantum', 'Atomic', 'Electric', 'Thunder', 'Storm',
    'Fire', 'Ice', 'Shadow', 'Light', 'Dark', 'Bright', 'Sharp', 'Smooth',
    'Rough', 'Silky', 'Velvet', 'Crystal', 'Diamond', 'Gold', 'Silver'
  ];
  
  const nouns = [
    'Goon', 'Beast', 'Titan', 'Phoenix', 'Dragon', 'Tiger', 'Lion', 'Wolf',
    'Eagle', 'Hawk', 'Falcon', 'Shark', 'Whale', 'Bear', 'Fox', 'Cat',
    'Dog', 'Bull', 'Horse', 'Deer', 'Rabbit', 'Squirrel', 'Owl', 'Crow',
    'Raven', 'Swan', 'Dove', 'Peacock', 'Flamingo', 'Penguin', 'Panda'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  
  return `${adjective}${noun}${number}`;
}

// Get or create user from backend
export async function getOrCreateUser(): Promise<GoonUser> {
  const stored = localStorage.getItem('goonUser');
  
  if (stored) {
    try {
      const user = JSON.parse(stored);
      // Update last active on backend
      try {
        await fetch(`${API_BASE}/users/${user.id}/active`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.warn('Failed to update last active:', error);
      }
      return user;
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
  }
  
  // Create new user on backend
  const goonUsername = generateGoonUsername();
  
  try {
    const response = await fetch(`${API_BASE}/users/goon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goon_username: goonUsername }),
    });

    if (response.ok) {
      const newUser = await response.json();
      localStorage.setItem('goonUser', JSON.stringify(newUser));
      return newUser;
    }
  } catch (error) {
    console.warn('Failed to create user on backend, using local fallback:', error);
  }

  // Fallback to local storage if backend fails
  const newUser: GoonUser = {
    id: `local_${crypto.randomUUID()}`,
    goon_username: goonUsername,
  };
  localStorage.setItem('goonUser', JSON.stringify(newUser));
  return newUser;
}

// Update user's Solana address
export async function updateUserSolanaAddress(address: string): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;

  try {
    const response = await fetch(`${API_BASE}/users/${user.id}/solana`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solana_address: address }),
    });

    if (response.ok) {
      const updatedUser = await response.json();
      localStorage.setItem('goonUser', JSON.stringify(updatedUser));
      return true;
    }
  } catch (error) {
    console.warn('Failed to update solana address on backend:', error);
  }

  // Fallback to local storage
  user.solana_address = address;
  localStorage.setItem('goonUser', JSON.stringify(user));
  return true;
}

// Get current user
export function getCurrentUser(): GoonUser | null {
  const stored = localStorage.getItem('goonUser');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
  }
  return null;
}

// Check if user has Solana address
export function hasSolanaAddress(): boolean {
  const user = getCurrentUser();
  return !!(user?.solana_address);
}