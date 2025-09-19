import { useMutation, useQuery, useAction } from "convex/react";
import {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from "convex/server";
import { useState, useCallback, useEffect, useMemo } from "react";

// =========================================
// Convex Retry Configuration
// =========================================
interface ConvexRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const DEFAULT_CONVEX_RETRY_CONFIG: ConvexRetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableErrors: [
    "Network error",
    "Failed to fetch",
    "Connection failed",
    "Timeout",
    "AbortError",
    "CONVEX_ERROR",
    "UNAVAILABLE",
  ],
};

// =========================================
// Retry Logic for Convex Operations
// =========================================
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: ConvexRetryConfig = DEFAULT_CONVEX_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (
        isRetryableConvexError(error as Error, config) &&
        attempt < config.maxRetries
      ) {
        const delay = getRetryDelay(attempt, config);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function isRetryableConvexError(
  error: Error,
  config: ConvexRetryConfig,
): boolean {
  const errorMessage = error.message.toLowerCase();
  return config.retryableErrors.some((retryableError) =>
    errorMessage.includes(retryableError.toLowerCase()),
  );
}

function getRetryDelay(attempt: number, config: ConvexRetryConfig): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

// =========================================
// Enhanced Convex Hooks with Retry Logic
// =========================================

/**
 * Enhanced useMutation with retry logic
 */
export function useMutationWithRetry<
  Mutation extends FunctionReference<"mutation">,
>(mutation: Mutation, retryConfig?: Partial<ConvexRetryConfig>) {
  const convexMutation = useMutation(mutation);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const config = useMemo(
    () => ({ ...DEFAULT_CONVEX_RETRY_CONFIG, ...retryConfig }),
    [retryConfig],
  );

  const mutateWithRetry = useCallback(
    async (
      args: FunctionArgs<Mutation>[0],
    ): Promise<FunctionReturnType<Mutation>> => {
      setIsRetrying(false);
      setRetryCount(0);

      return executeWithRetry(async () => {
        try {
          return await convexMutation(args);
        } catch (error) {
          setRetryCount((prev) => prev + 1);
          setIsRetrying(true);
          throw error;
        }
      }, config).finally(() => {
        setIsRetrying(false);
      });
    },
    [convexMutation, config],
  );

  return {
    mutate: mutateWithRetry,
    isLoading: isRetrying,
    retryCount,
  };
}

/**
 * Enhanced useQuery with retry logic
 */
export function useQueryWithRetry<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
  retryConfig?: Partial<ConvexRetryConfig>,
) {
  const convexQuery = useQuery(query, args);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const config = useMemo(
    () => ({ ...DEFAULT_CONVEX_RETRY_CONFIG, ...retryConfig }),
    [retryConfig],
  );

  // Retry logic for queries is handled by Convex internally,
  // but we can provide retry status information
  useEffect(() => {
    if (convexQuery === undefined && retryCount < config.maxRetries) {
      setIsRetrying(true);
      const timer = setTimeout(
        () => {
          setRetryCount((prev) => prev + 1);
          setIsRetrying(false);
        },
        getRetryDelay(retryCount + 1, config),
      );

      return () => clearTimeout(timer);
    }
  }, [convexQuery, retryCount, config]);

  return {
    data: convexQuery,
    isLoading: convexQuery === undefined,
    isRetrying,
    retryCount,
  };
}

/**
 * Enhanced useAction with retry logic
 */
export function useActionWithRetry<Action extends FunctionReference<"action">>(
  action: Action,
  retryConfig?: Partial<ConvexRetryConfig>,
) {
  const convexAction = useAction(action);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const config = useMemo(
    () => ({ ...DEFAULT_CONVEX_RETRY_CONFIG, ...retryConfig }),
    [retryConfig],
  );

  const actionWithRetry = useCallback(
    async (
      args: FunctionArgs<Action>[0],
    ): Promise<FunctionReturnType<Action>> => {
      setIsRetrying(false);
      setRetryCount(0);

      return executeWithRetry(async () => {
        try {
          return await convexAction(args);
        } catch (error) {
          setRetryCount((prev) => prev + 1);
          setIsRetrying(true);
          throw error;
        }
      }, config).finally(() => {
        setIsRetrying(false);
      });
    },
    [convexAction, config],
  );

  return {
    action: actionWithRetry,
    isLoading: isRetrying,
    retryCount,
  };
}

// =========================================
// Batch Operations with Retry Logic
// =========================================

/**
 * Execute multiple mutations with retry logic and partial success handling
 */
export async function batchMutationsWithRetry<T, R>(
  items: T[],
  mutation: (item: T) => Promise<R>,
  retryConfig?: Partial<ConvexRetryConfig>,
): Promise<{ successes: R[]; failures: { item: T; error: Error }[] }> {
  const config = { ...DEFAULT_CONVEX_RETRY_CONFIG, ...retryConfig };
  const successes: R[] = [];
  const failures: { item: T; error: Error }[] = [];

  for (const item of items) {
    try {
      const result = await executeWithRetry(() => mutation(item), config);
      successes.push(result);
    } catch (error) {
      failures.push({ item, error: error as Error });
    }
  }

  return { successes, failures };
}

/**
 * Execute mutations in parallel with retry logic
 */
export async function parallelMutationsWithRetry<T, R>(
  items: T[],
  mutation: (item: T) => Promise<R>,
  retryConfig?: Partial<ConvexRetryConfig>,
  concurrency: number = 5,
): Promise<{ successes: R[]; failures: { item: T; error: Error }[] }> {
  const config = { ...DEFAULT_CONVEX_RETRY_CONFIG, ...retryConfig };
  const successes: R[] = [];
  const failures: { item: T; error: Error }[] = [];

  // Process items in batches to control concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await executeWithRetry(() => mutation(item), config);
        return { success: true, result, item };
      } catch (error) {
        return { success: false, error: error as Error, item };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ success, result, error, item }) => {
      if (success) {
        successes.push(result as R);
      } else {
        failures.push({ item, error: error as Error });
      }
    });
  }

  return { successes, failures };
}

// =========================================
// Retry Status and Monitoring
// =========================================

/**
 * Hook to monitor retry status across the application
 */
export function useRetryStatus() {
  const [retryStats, setRetryStats] = useState({
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    activeRetries: 0,
  });

  const incrementRetry = useCallback((success: boolean) => {
    setRetryStats((prev) => ({
      ...prev,
      totalRetries: prev.totalRetries + 1,
      successfulRetries: success
        ? prev.successfulRetries + 1
        : prev.successfulRetries,
      failedRetries: success ? prev.failedRetries : prev.failedRetries + 1,
    }));
  }, []);

  const setActiveRetries = useCallback((count: number) => {
    setRetryStats((prev) => ({ ...prev, activeRetries: count }));
  }, []);

  return {
    retryStats,
    incrementRetry,
    setActiveRetries,
  };
}
