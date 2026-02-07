/**
 * Fetch wrapper with AbortController support and typed error handling
 * 
 * Provides:
 * - Automatic cleanup via AbortController
 * - Structured error responses with codes
 * - Auth header injection
 * - Timeout support
 */

// ===== Type Definitions =====

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  RATE_LIMIT: 'RATE_LIMIT',
  CORS_ERROR: 'CORS_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  ABORTED: 'ABORTED',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface FetchWithAbortOptions extends Omit<RequestInit, 'signal'> {
  signal?: AbortSignal;
  timeout?: number;
  includeAuth?: boolean;
}

export interface ErrorData {
  error?: string;
  message?: string;
  code?: string;
  aborted?: boolean;
  originalError?: unknown;
  [key: string]: unknown;
}

/**
 * Custom error class with structured data
 */
export class FetchError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  readonly data: ErrorData | null;

  constructor(
    message: string, 
    code: ErrorCode, 
    status: number | null = null, 
    data: ErrorData | null = null
  ) {
    super(message);
    this.name = 'FetchError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/**
 * Fetch with AbortController and error handling
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Fetch response
 * @throws FetchError Structured error with code and details
 */
export async function fetchWithAbort(
  url: string, 
  options: FetchWithAbortOptions = {}
): Promise<Response> {
  const {
    signal: externalSignal,
    timeout = 30000,
    includeAuth = true,
    ...fetchOptions
  } = options;

  // Create internal abort controller
  const controller = new AbortController();
  const { signal } = controller;

  // If external signal provided, forward its abort
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // Inject auth header if needed
    const headers: Record<string, string> = { ...(fetchOptions.headers as Record<string, string> || {}) };

    if (includeAuth) {
      const authToken = typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_FRONTEND_AUTH_TOKEN
        : process.env.VITE_FRONTEND_AUTH_TOKEN;
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal
    });

    clearTimeout(timeoutId);

    // Handle HTTP error responses
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorData: ErrorData | null = null;
      let errorMessage = `HTTP ${response.status}`;
      let errorCode: ErrorCode = ErrorCodes.UNKNOWN;

      // Try to parse error response
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
          errorMessage = errorData?.error || errorData?.message || errorMessage;
          if (errorData?.code && Object.values(ErrorCodes).includes(errorData.code as ErrorCode)) {
            errorCode = errorData.code as ErrorCode;
          }
        } catch {
          // Failed to parse error JSON
        }
      }

      // Map status codes to error codes
      if (response.status === 401) {
        errorCode = ErrorCodes.AUTH_REQUIRED;
      } else if (response.status === 403) {
        errorCode = errorData?.code === 'CORS_ERROR' ? ErrorCodes.CORS_ERROR : ErrorCodes.AUTH_INVALID;
      } else if (response.status === 429) {
        errorCode = ErrorCodes.RATE_LIMIT;
      } else if (response.status >= 500) {
        errorCode = ErrorCodes.SERVER_ERROR;
      }

      throw new FetchError(errorMessage, errorCode, response.status, errorData);
    }

    return response;

  } catch (error) {
    clearTimeout(timeoutId);

    const err = error as Error & { name?: string };

    // Handle abort
    if (err.name === 'AbortError') {
      throw new FetchError(
        'Request was cancelled',
        ErrorCodes.ABORTED,
        null,
        { aborted: true }
      );
    }

    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new FetchError(
        'Network error - cannot connect to server',
        ErrorCodes.NETWORK_ERROR,
        null,
        { originalError: err.message }
      );
    }

    // Re-throw FetchError instances
    if (error instanceof FetchError) {
      throw error;
    }

    // Unknown error
    throw new FetchError(
      err.message || 'Unknown error occurred',
      ErrorCodes.UNKNOWN,
      null,
      { originalError: error }
    );
  }
}

/**
 * Helper to fetch JSON with automatic parsing
 */
export async function fetchJSON<T = unknown>(
  url: string, 
  options: FetchWithAbortOptions = {}
): Promise<T> {
  const response = await fetchWithAbort(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }
  });

  return response.json() as Promise<T>;
}

/**
 * Helper to post JSON data
 */
export async function postJSON<T = unknown, D = unknown>(
  url: string, 
  data: D, 
  options: FetchWithAbortOptions = {}
): Promise<T> {
  return fetchJSON<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Create a reusable abort controller that can be passed to components
 */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof FetchError && error.code === code;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (!(error instanceof FetchError)) {
    return 'An unexpected error occurred';
  }

  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      return 'Cannot connect to server. Please check your connection and ensure the backend is running.';

    case ErrorCodes.AUTH_REQUIRED:
    case ErrorCodes.AUTH_INVALID:
      return 'Authentication failed. Please check your configuration.';

    case ErrorCodes.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';

    case ErrorCodes.CORS_ERROR:
      return 'Access denied. Your origin is not allowed.';

    case ErrorCodes.SERVER_ERROR:
      return 'Server error. Please try again later.';

    case ErrorCodes.TIMEOUT:
      return 'Request timed out. Please try again.';

    case ErrorCodes.ABORTED:
      return 'Request was cancelled.';

    default:
      return error.message || 'An error occurred';
  }
}
