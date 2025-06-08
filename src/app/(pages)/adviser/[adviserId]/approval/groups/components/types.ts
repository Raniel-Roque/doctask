export interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface Group {
  _id: string;
  name?: string;
  capstone_title?: string;
  projectManager?: User;
  members?: User[];
  adviser?: User;
  grade?: number;
} 