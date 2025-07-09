import { ConvexError } from "convex/values";
import { MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

// Input validation helpers
export function validateString(
  value: unknown,
  fieldName: string,
  maxLength: number = 1000,
): string {
  if (typeof value !== "string") {
    throw new ConvexError(`${fieldName} must be a string`);
  }

  if (value.length > maxLength) {
    throw new ConvexError(
      `${fieldName} must be ${maxLength} characters or less`,
    );
  }

  if (value.trim().length === 0) {
    throw new ConvexError(`${fieldName} cannot be empty`);
  }

  return value.trim();
}

export function validateOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number = 1000,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return validateString(value, fieldName, maxLength);
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ConvexError("Invalid email format");
  }

  return email.toLowerCase().trim();
}

export function validateId(
  value: unknown,
  fieldName: string,
): Id<
  | "users"
  | "groupsTable"
  | "documents"
  | "notes"
  | "taskAssignments"
  | "documentStatus"
  | "images"
  | "studentsTable"
  | "advisersTable"
> {
  if (typeof value !== "string" || !value.startsWith("_")) {
    throw new ConvexError(`${fieldName} must be a valid ID`);
  }

  return value as Id<
    | "users"
    | "groupsTable"
    | "documents"
    | "notes"
    | "taskAssignments"
    | "documentStatus"
    | "images"
    | "studentsTable"
    | "advisersTable"
  >;
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number,
): number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ConvexError(`${fieldName} must be a valid number`);
  }

  if (min !== undefined && value < min) {
    throw new ConvexError(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new ConvexError(`${fieldName} must be at most ${max}`);
  }

  return value;
}

export function validateArray<T>(
  value: unknown,
  fieldName: string,
  validator?: (item: unknown) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new ConvexError(`${fieldName} must be an array`);
  }

  if (validator) {
    return value.map((item, index) => {
      try {
        return validator(item);
      } catch (error) {
        throw new ConvexError(
          `${fieldName}[${index}]: ${error instanceof Error ? error.message : "Invalid item"}`,
        );
      }
    });
  }

  return value as T[];
}

// Access control helpers
export async function validateUserAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<{ user: Doc<"users">; role: number }> {
  const user = await ctx.db.get(userId);
  if (!user || user.isDeleted) {
    throw new ConvexError("User not found or deleted");
  }

  return { user, role: user.role };
}

export async function validateStudentAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
  groupId: Id<"groupsTable">,
): Promise<{ user: Doc<"users">; group: Doc<"groupsTable"> }> {
  const { user, role } = await validateUserAccess(ctx, userId);

  if (role !== 0) {
    throw new ConvexError("Only students can perform this action");
  }

  const group = await ctx.db.get(groupId);
  if (!group || group.isDeleted) {
    throw new ConvexError("Group not found or deleted");
  }

  // Check if user is in the group
  const isProjectManager = group.project_manager_id === userId;
  const isMember = group.member_ids.includes(userId);

  if (!isProjectManager && !isMember) {
    throw new ConvexError("User does not have access to this group");
  }

  return { user, group };
}

export async function validateAdviserAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
  groupId: Id<"groupsTable">,
): Promise<{
  user: Doc<"users">;
  group: Doc<"groupsTable">;
  adviser: Doc<"advisersTable">;
}> {
  const { user, role } = await validateUserAccess(ctx, userId);

  if (role !== 1) {
    throw new ConvexError("Only advisers can perform this action");
  }

  const group = await ctx.db.get(groupId);
  if (!group || group.isDeleted) {
    throw new ConvexError("Group not found or deleted");
  }

  // Check if adviser is assigned to this group
  if (group.adviser_id !== userId) {
    throw new ConvexError("Adviser is not assigned to this group");
  }

  const adviser = await ctx.db
    .query("advisersTable")
    .withIndex("by_adviser", (q) => q.eq("adviser_id", userId))
    .first();

  if (!adviser || adviser.isDeleted) {
    throw new ConvexError("Adviser record not found");
  }

  return { user, group, adviser };
}

export async function validateInstructorAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<{ user: Doc<"users"> }> {
  const { user, role } = await validateUserAccess(ctx, userId);

  if (role !== 2) {
    throw new ConvexError("Only instructors can perform this action");
  }

  return { user };
}

// Rate limiting simulation for Convex (basic implementation)
const mutationCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  operation: string,
  userId: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const key = `${operation}:${userId}`;
  const now = Date.now();

  // Clean up expired entries
  if (mutationCounts.has(key)) {
    const entry = mutationCounts.get(key)!;
    if (now > entry.resetTime) {
      mutationCounts.delete(key);
    }
  }

  // Get or create count entry
  let entry = mutationCounts.get(key);
  if (!entry) {
    entry = { count: 0, resetTime: now + windowMs };
    mutationCounts.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return false;
  }

  // Increment counter
  entry.count++;
  return true;
}

// Content validation helpers
export function validateDocumentContent(content: string): string {
  const validatedContent = validateString(content, "content", 1000000); // 1MB limit

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(validatedContent)) {
      throw new ConvexError("Content contains potentially malicious code");
    }
  }

  return validatedContent;
}

export function validateNoteContent(content: string): string {
  const validatedContent = validateString(content, "content", 10000); // 10KB limit for notes

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(validatedContent)) {
      throw new ConvexError("Note content contains potentially malicious code");
    }
  }

  return validatedContent;
}

// File validation helpers
export function validateFileName(filename: string): string {
  const validatedName = validateString(filename, "filename", 255);

  // Check for potentially dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(validatedName)) {
    throw new ConvexError("Filename contains invalid characters");
  }

  // Check for reserved names
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];
  const nameWithoutExt = validatedName.split(".")[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    throw new ConvexError("Filename is reserved");
  }

  return validatedName;
}

export function validateFileSize(
  size: number,
  maxSize: number = 5 * 1024 * 1024,
): number {
  const validatedSize = validateNumber(size, "file size", 0, maxSize);

  if (validatedSize === 0) {
    throw new ConvexError("File size cannot be zero");
  }

  return validatedSize;
}

export function validateFileType(
  contentType: string,
  allowedTypes: string[],
): string {
  const validatedType = validateString(contentType, "content type", 100);

  if (!allowedTypes.includes(validatedType)) {
    throw new ConvexError(`File type ${validatedType} is not allowed`);
  }

  return validatedType;
}
