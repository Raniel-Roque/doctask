/**
 * Utility functions for providing user-friendly error messages
 */

export interface ErrorContext {
  operation:
    | "add"
    | "edit"
    | "delete"
    | "reset-password"
    | "lock-account"
    | "reset-code"
    | "upload"
    | "fetch";
  entity: "user" | "student" | "adviser" | "group" | "document" | "data";
  details?: string;
}

/**
 * Convert generic error messages to user-friendly, specific messages
 */
export function getErrorMessage(
  error: Error | string | unknown,
  context: ErrorContext,
): string {
  const errorMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  const lowerError = errorMessage.toLowerCase();

  // Handle specific error patterns
  if (
    lowerError.includes("failed to fetch") ||
    lowerError.includes("network error")
  ) {
    return getNetworkErrorMessage(context);
  }

  if (lowerError.includes("timeout") || lowerError.includes("abort")) {
    return getTimeoutErrorMessage(context);
  }

  if (lowerError.includes("unauthorized") || lowerError.includes("403")) {
    return getUnauthorizedErrorMessage();
  }

  if (lowerError.includes("not found") || lowerError.includes("404")) {
    return getNotFoundErrorMessage(context);
  }

  if (lowerError.includes("validation") || lowerError.includes("invalid")) {
    return getValidationErrorMessage(context);
  }

  if (
    lowerError.includes("duplicate") ||
    lowerError.includes("already exists")
  ) {
    return getDuplicateErrorMessage(context);
  }

  // Return the original error message if it's already user-friendly
  if (isUserFriendlyMessage(errorMessage)) {
    return errorMessage;
  }

  // Default fallback message
  return getDefaultErrorMessage(context);
}

/**
 * Get network-related error messages
 */
function getNetworkErrorMessage(context: ErrorContext): string {
  const { operation, entity } = context;

  switch (operation) {
    case "add":
      return `Failed to add ${entity}. Please check your internet connection and try again.`;
    case "edit":
      return `Failed to update ${entity}. Please check your internet connection and try again.`;
    case "delete":
      return `Failed to delete ${entity}. Please check your internet connection and try again.`;
    case "reset-password":
      return `Failed to reset password. Please check your internet connection and try again.`;
    case "lock-account":
      return `Failed to ${context.details || "update account status"}. Please check your internet connection and try again.`;
    case "reset-code":
      return `Failed to reset ${entity} code. Please check your internet connection and try again.`;
    case "upload":
      return `Failed to upload file. Please check your internet connection and try again.`;
    case "fetch":
      return `Failed to load ${entity} data. Please check your internet connection and try again.`;
    default:
      return `Network error. Please check your internet connection and try again.`;
  }
}

/**
 * Get timeout-related error messages
 */
function getTimeoutErrorMessage(context: ErrorContext): string {
  const { operation, entity } = context;

  switch (operation) {
    case "add":
      return `Adding ${entity} is taking longer than expected. Please try again.`;
    case "edit":
      return `Updating ${entity} is taking longer than expected. Please try again.`;
    case "delete":
      return `Deleting ${entity} is taking longer than expected. Please try again.`;
    case "upload":
      return `File upload is taking longer than expected. Please try again.`;
    case "fetch":
      return `Loading ${entity} data is taking longer than expected. Please try again.`;
    default:
      return `Operation is taking longer than expected. Please try again.`;
  }
}

/**
 * Get unauthorized error messages
 */
function getUnauthorizedErrorMessage(): string {
  return `You don't have permission to perform this action. Please contact your administrator.`;
}

/**
 * Get not found error messages
 */
function getNotFoundErrorMessage(context: ErrorContext): string {
  const { entity } = context;
  return `${entity.charAt(0).toUpperCase() + entity.slice(1)} not found. It may have been deleted or moved.`;
}

/**
 * Get validation error messages
 */
function getValidationErrorMessage(context: ErrorContext): string {
  const { operation, entity } = context;

  switch (operation) {
    case "add":
      return `Invalid ${entity} information. Please check your input and try again.`;
    case "edit":
      return `Invalid ${entity} information. Please check your changes and try again.`;
    default:
      return `Invalid information provided. Please check your input and try again.`;
  }
}

/**
 * Get duplicate error messages
 */
function getDuplicateErrorMessage(context: ErrorContext): string {
  const { entity } = context;
  return `${entity.charAt(0).toUpperCase() + entity.slice(1)} already exists. Please use different information.`;
}

/**
 * Get default error messages
 */
function getDefaultErrorMessage(context: ErrorContext): string {
  const { operation, entity } = context;

  switch (operation) {
    case "add":
      return `Failed to add ${entity}. Please try again.`;
    case "edit":
      return `Failed to update ${entity}. Please try again.`;
    case "delete":
      return `Failed to delete ${entity}. Please try again.`;
    case "reset-password":
      return `Failed to reset password. Please try again.`;
    case "lock-account":
      return `Failed to ${context.details || "update account status"}. Please try again.`;
    case "reset-code":
      return `Failed to reset ${entity} code. Please try again.`;
    case "upload":
      return `Failed to upload file. Please try again.`;
    case "fetch":
      return `Failed to load ${entity} data. Please try again.`;
    default:
      return `An error occurred. Please try again.`;
  }
}

/**
 * Check if an error message is already user-friendly
 */
function isUserFriendlyMessage(message: string): boolean {
  const userFriendlyPatterns = [
    /^[A-Z][a-z].*\.$/, // Starts with capital letter and ends with period
    /already exists/i,
    /already locked/i,
    /not currently locked/i,
    /not found/i,
    /invalid/i,
    /required/i,
    /permission/i,
    /unauthorized/i,
  ];

  return userFriendlyPatterns.some((pattern) => pattern.test(message));
}

/**
 * Create error context for common operations
 */
export const ErrorContexts = {
  addUser: (entity: "student" | "adviser"): ErrorContext => ({
    operation: "add",
    entity,
  }),
  editUser: (
    entity: "student" | "adviser" | "group" | "document",
  ): ErrorContext => ({ operation: "edit", entity }),
  deleteUser: (entity: "student" | "adviser" | "group"): ErrorContext => ({
    operation: "delete",
    entity,
  }),
  addGroup: (): ErrorContext => ({ operation: "add", entity: "group" }),
  editGroup: (): ErrorContext => ({ operation: "edit", entity: "group" }),
  deleteGroup: (): ErrorContext => ({ operation: "delete", entity: "group" }),
  resetPassword: (): ErrorContext => ({
    operation: "reset-password",
    entity: "user",
  }),
  lockAccount: (action: "lock" | "unlock"): ErrorContext => ({
    operation: "lock-account",
    entity: "user",
    details: action,
  }),
  resetCode: (entity: "adviser"): ErrorContext => ({
    operation: "reset-code",
    entity,
  }),
  uploadFile: (): ErrorContext => ({ operation: "upload", entity: "data" }),
  fetchData: (
    entity: "user" | "student" | "adviser" | "group" | "document",
  ): ErrorContext => ({
    operation: "fetch",
    entity,
  }),
};
