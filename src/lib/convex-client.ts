import { ConvexHttpClient } from "convex/browser";

// Shared Convex client instance to avoid creating new clients repeatedly
let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return convexClient;
}

// Utility function for parallel operations
export async function parallelQueries<T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(queries.map(query => query()));
}

// Utility function for batch operations with error handling
export async function batchOperations<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => operation(item).catch(() => null))
    );
    results.push(...batchResults.filter(result => result !== null));
  }
  
  return results;
}
