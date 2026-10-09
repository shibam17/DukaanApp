export function friendlyError(
  error: { message?: string } | string | null | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message = typeof error === 'string' ? error : error?.message;
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('offline') ||
    lower.includes('internet') ||
    lower.includes('network request failed')
  ) {
    return 'No internet connection';
  }

  return message;
}
