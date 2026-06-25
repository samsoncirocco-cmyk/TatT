/**
 * Fetch wrapper with AbortController support and typed error handling
 * 
 * Provides:
 * - Automatic cleanup via AbortController
 * - Structured error responses with codes
 * - Auth header injection
 * - Timeout support
 */

/**
 * Error codes for typed error handling
 */
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
};

/**
 * Custom error class with structured data
 */
export class FetchError extends Error {
  constructor(message, code, status = null, data = null) {
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
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {AbortSignal} options.signal - Optional external abort signal
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {boolean} options.includeAuth - Whether to include auth header (default: true)
 * @returns {Promise<Response>} Fetch response
 * @throws {FetchError} Structured error with code and details
 */
export async function fetchWithAbort(url, options = {}) {
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
    const headers = { ...fetchOptions.headers };

    if (includeAuth) {
      const authToken = process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN;
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
      let errorData = null;
      let errorMessage = `HTTP ${response.status}`;
      let errorCode = ErrorCodes.UNKNOWN;

      // Try to parse error response
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorCode = errorData.code || errorCode;
        } catch (e) {
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

    // Handle abort
    if (error.name === 'AbortError') {
      throw new FetchError(
        'Request was cancelled',
        ErrorCodes.ABORTED,
        null,
        { aborted: true }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FetchError(
        'Network error - cannot connect to server',
        ErrorCodes.NETWORK_ERROR,
        null,
        { originalError: error.message }
      );
    }

    // Re-throw FetchError instances
    if (error instanceof FetchError) {
      throw error;
    }

    // Unknown error
    throw new FetchError(
      error.message || 'Unknown error occurred',
      ErrorCodes.UNKNOWN,
      null,
      { originalError: error }
    );
  }
}

/**
 * Helper to fetch JSON with automatic parsing
 */
export async function fetchJSON(url, options = {}) {
  const response = await fetchWithAbort(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  return response.json();
}

/**
 * Helper to post JSON data
 */
export async function postJSON(url, data, options = {}) {
  return fetchJSON(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Create a reusable abort controller that can be passed to components
 */
export function createAbortController() {
  return new AbortController();
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error, code) {
  return error instanceof FetchError && error.code === code;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error) {
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

