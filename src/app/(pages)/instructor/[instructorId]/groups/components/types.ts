import { Id, Doc } from "../../../../../../../convex/_generated/dataModel";

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  clerk_id: string;
  email: string;
  email_verified: boolean;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: number;
  subrole?: number;
}

export type Group = Doc<"groupsTable"> & {
  // Additional fields for display
  projectManager?: User;
  members?: User[];
  adviser?: User;
  name?: string;
};
