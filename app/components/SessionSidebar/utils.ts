/**
 * Helper function to encode titles for URLs
 * Converts spaces to hyphens and encodes special characters
 *
 * @param title - The title string to encode
 * @returns Encoded URL-friendly string
 */
export function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-chat')
    .toLowerCase()
    .replace(/%20/g, '-');
}
