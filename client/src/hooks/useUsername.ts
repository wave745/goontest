// Simple hook that just returns "Anonymous" user data
export function useUsername() {
  const getUserAvatar = () => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=Anonymous`;
  };

  return {
    displayName: "Anonymous",
    username: "Anonymous", // Keep for backward compatibility
    getUserAvatar
  };
}