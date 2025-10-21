export interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface Document {
  _id: string;
  chapter: string;
  title: string;
  status: number; // This represents review_status from documentStatus table (0=not_submitted, 1=submitted, 2=approved, 3=rejected)
  lastModified?: number; // This comes from documentStatus.last_modified
  content?: string;
  reviewNotes?: string;
}

export interface Group {
  _id: string;
  name?: string;
  capstone_title?: string;
  capstone_type?: number; // 0 = CP1, 1 = CP2
  projectManager?: User;
  members?: User[];
  adviser?: User;
  grade?: number;
  documentCount: number;
  documents: Document[];
}
