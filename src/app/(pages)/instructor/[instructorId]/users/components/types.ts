import { Id } from "../../../../../../../convex/_generated/dataModel";

// =========================================
// User Types
// =========================================
export interface User {
  _id: Id<"users">;
  _creationTime: number;
  clerk_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  role: number;
  subrole?: number;
}

// =========================================
// Form Types
// =========================================
export interface EditFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  subrole?: number;
}

export interface AddFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  subrole?: number;
}

// =========================================
// Notification Types
// =========================================
export interface Notification {
  type: "error" | "success" | "warning" | "info";
  message: string;
}

// =========================================
// Log Types
// =========================================
export interface LogDetails {
  userId?: string;
  email?: string;
  error?: string;
  oldEmail?: string;
  newEmail?: string;
  firstName?: string;
  lastName?: string;
  formData?: AddFormData;
  details?: string;
  changes?: {
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    subrole?: boolean;
  };
  user?: User;
  action?: "lock" | "unlock";
}

// =========================================
// Table Constants
// =========================================
export const TABLE_CONSTANTS = {
  STATUS_FILTERS: {
    ALL: "ALL STATUS",
    VERIFIED: "VERIFIED",
    UNVERIFIED: "UNVERIFIED",
  },
  ROLE_FILTERS: {
    ALL: "ALL ROLE",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
  },
  DEFAULT_SORT_FIELD: "first_name" as const,
  DEFAULT_SORT_DIRECTION: "asc" as const,
  ITEMS_PER_PAGE: 10,
} as const;

// =========================================
// Table Types
// =========================================
export type SortField = "first_name" | "last_name" | "email" | "_creationTime";
export type SortDirection = "asc" | "desc";
