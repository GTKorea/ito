import { isAxiosError } from 'axios';

/**
 * Extract a user-friendly error message from an API error response.
 * Falls back to the provided default message if extraction fails.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
