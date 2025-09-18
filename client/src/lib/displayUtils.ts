// Utility functions for anonymous platform display

/**
 * Gets anonymous display name for all users
 */
export function getAnonymousDisplayName(): string {
  return 'Anonymous User';
}

/**
 * Gets anonymous profile URL (redirects to home)
 */
export function getAnonymousProfileUrl(): string {
  return '/';
}

/**
 * Gets the avatar seed for generating anonymous placeholder avatars
 */
export function getAnonymousAvatarSeed(): string {
  return 'anonymous';
}