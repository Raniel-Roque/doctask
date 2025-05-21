import { Id } from "../../../../../../../../convex/_generated/dataModel";

export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface Adviser {
  _id: Id<"users">;
  _creationTime: number;
  middle_name?: string;
  clerk_id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  role: number;
}

export interface EditFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

export interface AddFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

export const TABLE_CONSTANTS = {
  STATUS_FILTERS: {
    ALL: "all",
    VERIFIED: "verified",
    PENDING: "pending",
  },
  DEFAULT_SORT_FIELD: "first_name" as const,
  DEFAULT_SORT_DIRECTION: "asc" as const,
};

export type SortField = "first_name" | "last_name" | "email" | "_creationTime";
export type SortDirection = "asc" | "desc"; 