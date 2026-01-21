/**
 * Base API client with error handling
 * Provides a fetch wrapper with automatic token injection and error handling
 */

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Get the base URL for the Python API
 */
export function getPythonApiUrl(): string {
  // Use NEXT_PUBLIC_ prefix for client-side access
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";
  }
  return process.env.PYTHON_API_URL || "http://localhost:8000";
}

/**
 * Get the base URL for the Java FPA Engine
 */
export function getJavaEngineUrl(): string {
  return process.env.JAVA_ENGINE_URL || "http://localhost:8081";
}

/**
 * Get session token from cookies (client-side)
 * Reads from auth_token cookie which is set as non-HTTP-only for API calls
 */
function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    // Try auth_token first (non-HTTP-only), then session_token as fallback
    if (name === "auth_token" || name === "session_token") {
      return value;
    }
  }
  return null;
}

/**
 * Handle API response and throw APIError if not ok
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { message?: string; details?: Record<string, unknown> } = {};
    
    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
    }

    throw new APIError(
      response.status,
      errorData.message || getDefaultErrorMessage(response.status),
      errorData.details
    );
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {} as T;
  }

  return response.json();
}

/**
 * Get default error message based on status code
 */
function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "Bad request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not found";
    case 500:
      return "Internal server error";
    case 502:
      return "Bad gateway";
    case 503:
      return "Service unavailable";
    default:
      return "An error occurred";
  }
}

/**
 * Request options for the API client
 */
export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Create a fetch wrapper for a specific base URL
 */
function createFetcher(baseUrl: string, requireAuth: boolean = true) {
  return async function fetcher<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { body, params, headers: customHeaders, ...restOptions } = options;

    const url = buildUrl(baseUrl, path, params);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // Add session token if available and required
    if (requireAuth) {
      const token = getSessionToken();
      if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...restOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: requireAuth ? "include" : "omit", // Only include cookies if auth required
    });

    return handleResponse<T>(response);
  };
}

/**
 * Python API client
 */
export const pythonApi = {
  fetch: createFetcher(getPythonApiUrl()),
  
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "GET" });
  },
  
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "POST", body });
  },
  
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "PUT", body });
  },
  
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "DELETE" });
  },
};

/**
 * Public Python API client (no authentication required)
 */
export const publicPythonApi = {
  fetch: createFetcher(getPythonApiUrl(), false),
  
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "GET" });
  },
  
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "POST", body });
  },
  
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "PUT", body });
  },
  
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "DELETE" });
  },
};

/**
 * Java FPA Engine client
 */
export const javaApi = {
  fetch: createFetcher(getJavaEngineUrl()),
  
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "GET" });
  },
  
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "POST", body });
  },
};
