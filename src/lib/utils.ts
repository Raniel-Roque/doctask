import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardized API request utility for robust error handling.
 * Usage:
 *   const data = await apiRequest('/api/route', { method: 'POST', body: JSON.stringify(payload) });
 *   // If not ok, throws with error message from response
 */
export async function apiRequest<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse error
  }
  // Type guard for error property
  const hasError = (d: unknown): d is { error: string } =>
    typeof d === "object" &&
    d !== null &&
    "error" in d &&
    typeof (d as Record<string, unknown>).error === "string";
  if (!res.ok || (data && hasError(data))) {
    throw new Error(
      hasError(data) ? data.error : res.statusText || "API request failed",
    );
  }
  return data as T;
}
