// Utility functions for consistent user display across the app

interface UserLike {
  goon_username?: string;
  handle?: string;
}

/**
 * Gets the display username for a user, prioritizing goon_username over handle
 */
export function getDisplayUsername(user: UserLike): string {
  return user.goon_username || user.handle || 'unknown';
}

/**
 * Gets the profile URL for a user
 */
export function getProfileUrl(user: UserLike): string {
  return `/c/${getDisplayUsername(user)}`;
}

/**
 * Gets the avatar seed for generating placeholder avatars
 */
export function getAvatarSeed(user: UserLike): string {
  return getDisplayUsername(user);
}