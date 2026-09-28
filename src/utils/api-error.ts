import { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as ApiErrorBody | undefined)?.message;
    if (message) {
      return message;
    }
  }
  return fallback;
}
