import { getAccessToken } from './supabase-client';

// Mirrors backend/src/RosterApp.Api/Common/ApiResponse.cs exactly — every
// endpoint responds with this envelope, success and error alike.
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
}

interface ApiErrorPayload {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

// Thrown for both transport failures and success:false responses, so
// callers (TanStack Query onError, route actions) have one error shape to
// handle regardless of where the failure occurred.
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, string[]> | null;

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  // 204 No Content has no body to parse (e.g. DELETE endpoints).
  if (response.status === 204) {
    return undefined as T;
  }

  const envelope = (await response.json()) as ApiResponseEnvelope<T>;

  if (!envelope.success || envelope.error) {
    throw new ApiClientError(
      response.status,
      envelope.error ?? {
        code: 'unknown_error',
        message: 'The server returned an unsuccessful response.',
        details: null,
      },
    );
  }

  return envelope.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
