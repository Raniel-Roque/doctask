import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =========================================
// Retry Configuration Types
// =========================================
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

// =========================================
// Default Configurations
// =========================================
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 30000, // 30 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: [
    "Network error",
    "Failed to fetch",
    "Connection failed",
    "Timeout",
    "AbortError",
  ],
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3, // Reduced from 5 to be less aggressive
  recoveryTimeout: 30000, // 30 seconds instead of 1 minute
  monitoringPeriod: 300000, // 5 minutes
};

// =========================================
// Circuit Breaker Implementation
// =========================================
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error(
          "Circuit breaker is OPEN - service temporarily unavailable",
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

// =========================================
// Global Circuit Breakers
// =========================================
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(
      service,
      new CircuitBreaker(DEFAULT_CIRCUIT_BREAKER_CONFIG),
    );
  }
  return circuitBreakers.get(service)!;
}

// =========================================
// Enhanced API Request with Retry Logic
// =========================================
export async function apiRequest<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
  retryConfig?: Partial<RetryConfig>,
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const service =
    typeof input === "string"
      ? new URL(input, window.location.origin).pathname
      : "unknown";

  return getCircuitBreaker(service).execute(async () => {
    return await executeWithRetry(input, init, config);
  });
}

async function executeWithRetry<T>(
  input: RequestInfo,
  init: RequestInit | undefined,
  config: RetryConfig,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // ignore JSON parse error
      }

      // Type guard for error property
      const hasError = (d: unknown): d is { error: string } =>
        typeof d === "object" &&
        d !== null &&
        "error" in d &&
        typeof (d as Record<string, unknown>).error === "string";

      if (!response.ok || (data && hasError(data))) {
        const errorMessage = hasError(data)
          ? data.error
          : response.statusText || "API request failed";
        const error = new Error(errorMessage);

        // Check if error is retryable
        if (isRetryableError(error, response.status, config)) {
          lastError = error;
          if (attempt < config.maxRetries) {
            await delay(getRetryDelay(attempt, config));
            continue;
          }
        }
        throw error;
      }

      return data as T;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (isRetryableError(error as Error, 0, config)) {
        if (attempt < config.maxRetries) {
          await delay(getRetryDelay(attempt, config));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function isRetryableError(
  error: Error,
  status: number,
  config: RetryConfig,
): boolean {
  // Check status codes
  if (status > 0 && config.retryableStatuses.includes(status)) {
    return true;
  }

  // Check error messages
  const errorMessage = error.message.toLowerCase();
  return config.retryableErrors.some((retryableError) =>
    errorMessage.includes(retryableError.toLowerCase()),
  );
}

function getRetryDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================
// Specialized API Request Functions
// =========================================

/**
 * API request with extended timeout for file uploads
 */
export async function apiRequestWithUploadTimeout<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  return apiRequest(input, init, {
    timeout: 120000, // 2 minutes for uploads
    maxRetries: 2, // Fewer retries for uploads
  });
}

/**
 * API request with quick timeout for real-time operations
 */
export async function apiRequestQuick<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  return apiRequest(input, init, {
    timeout: 5000, // 5 seconds
    maxRetries: 1, // Single retry for quick operations
  });
}

/**
 * API request with no retries for critical operations that should fail fast
 */
export async function apiRequestNoRetry<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  return apiRequest(input, init, {
    maxRetries: 0,
  });
}

// =========================================
// Circuit Breaker Status Utilities
// =========================================

/**
 * Get the status of all circuit breakers
 */
export function getCircuitBreakerStatus(): Record<
  string,
  { state: string; failures: number }
> {
  const status: Record<string, { state: string; failures: number }> = {};
  circuitBreakers.forEach((breaker, service) => {
    status[service] = {
      state: breaker.getState(),
      failures: breaker.getFailures(),
    };
  });
  return status;
}

/**
 * Reset a specific circuit breaker
 */
export function resetCircuitBreaker(service: string): void {
  const breaker = circuitBreakers.get(service);
  if (breaker) {
    circuitBreakers.delete(service);
  }
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Reset circuit breakers for a specific service when coming back online
 */
export function resetCircuitBreakerOnReconnect(service: string): void {
  const breaker = circuitBreakers.get(service);
  if (breaker) {
    // Reset the breaker state to allow immediate retry
    breaker["failures"] = 0;
    breaker["state"] = "CLOSED";
    breaker["lastFailureTime"] = 0;
  }
}
