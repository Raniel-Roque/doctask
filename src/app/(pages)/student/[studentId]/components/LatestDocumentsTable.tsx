import {
  FaEye,
  FaDownload,
  FaEdit,
  FaPlus,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";

interface Document {
  _id: Id<"documents">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  chapter: string;
  room_id: string;
  title: string;
  content: string;
  student_ids: Id<"users">[];
  status: number;
  last_modified?: number;
}

interface Task {
  _id: Id<"taskAssignments">;
  group_id: Id<"groupsTable">;
  chapter: string;
  section: string;
  title: string;
  task_status: number; // 0 = incomplete, 1 = completed (for member/manager communication)
  assigned_student_ids: Id<"users">[];
  assignedUsers?: Array<{
    _id: Id<"users">;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

interface AdviserObj {
  first_name: string;
  middle_name?: string;
  last_name: string;
  pending?: boolean;
  pendingName?: string;
  onCancel?: () => void;
}

interface LatestDocumentsTableProps {
  documents: Document[];
  status: "loading" | "error" | "idle" | "no_group";
  currentUserId: Id<"users">;
  capstoneTitle?: string;
  grade?: number;
  adviser?: AdviserObj;
  onShowAdviserPopup: () => void;
  isSubmitting: boolean;
  mode: "manager" | "member";
  tasks?: Task[];
}

// Grade mapping
const GRADE_MAP: { [key: number]: string } = {
  0: "No Grade",
  1: "Approved",
  2: "Approved With Revisions",
  3: "Disapproved",
  4: "Accepted With Revisions",
  5: "Reoral Defense",
  6: "Not Accepted",
};

// Status color mapping for review_status (instructor/manager review process)
const STATUS_COLORS: { [key: number]: string } = {
  0: "bg-gray-100 text-gray-800", // not_submitted
  1: "bg-yellow-100 text-yellow-800", // in_review
  2: "bg-green-100 text-green-800", // approved
  3: "bg-red-100 text-red-800", // rejected
};

// Status label mapping for review_status
const STATUS_LABELS: { [key: number]: string } = {
  0: "Not Submitted",
  1: "In Review",
  2: "Approved",
  3: "Rejected",
};

// Define the proper chapter order for sorting
const CHAPTER_ORDER = [
  "acknowledgment",
  "abstract",
  "table_of_contents",
  "chapter_1",
  "chapter_2",
  "chapter_3",
  "chapter_4",
  "chapter_5",
  "references",
  "appendix_b",
  "appendix_c",
  "appendix_e",
  "appendix_f",
  "appendix_g",
  "appendix_h",
  "appendix_i",
];

export const LatestDocumentsTable = ({
  documents,
  status,
  currentUserId,
  capstoneTitle,
  grade,
  adviser,
  onShowAdviserPopup,
  isSubmitting,
  mode,
  tasks = [],
}: LatestDocumentsTableProps) => {
  // Add state for status filter
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Add state for advanced details dropdown
  const [openDetails, setOpenDetails] = useState<"documents" | "tasks" | null>(
    null,
  );

  const handleToggleDetails = (detailType: "documents" | "tasks") => {
    setOpenDetails((prev) => (prev === detailType ? null : detailType));
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: "all", label: "STATUS" },
    { value: "0", label: "NOT SUBMITTED" },
    { value: "1", label: "IN REVIEW" },
    { value: "2", label: "APPROVED" },
    { value: "3", label: "REJECTED" },
  ];

  // Filter documents based on selected status
  const filteredDocuments = documents.filter((doc) => {
    if (selectedStatus === "all") return true;
    return doc.status === parseInt(selectedStatus);
  });

  // Documents that are view/download only
  const viewOnlyDocuments = ["title_page", "appendix_a", "appendix_d"];

  // Check if user can edit the document
  const canEditDocument = (doc: Document) => {
    if (viewOnlyDocuments.includes(doc.chapter)) return false;
    return doc.student_ids.includes(currentUserId);
  };

  const displayCapstoneTitle =
    capstoneTitle && capstoneTitle.trim() !== ""
      ? capstoneTitle
      : "Untitled Capstone Document";

  // Format last modified time
  const formatLastModified = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // --- Progress Bar Logic ---
  const totalDocuments = documents.length;
  const statusCounts = {
    approved: documents.filter((d) => d.status === 2).length,
    rejected: documents.filter((d) => d.status === 3).length,
    in_review: documents.filter((d) => d.status === 1).length,
    not_submitted: documents.filter((d) => d.status === 0).length,
  };

  const progress = {
    approved:
      totalDocuments > 0 ? (statusCounts.approved / totalDocuments) * 100 : 0,
    rejected:
      totalDocuments > 0 ? (statusCounts.rejected / totalDocuments) * 100 : 0,
    in_review:
      totalDocuments > 0 ? (statusCounts.in_review / totalDocuments) * 100 : 0,
    not_submitted:
      totalDocuments > 0
        ? (statusCounts.not_submitted / totalDocuments) * 100
        : 0,
  };

  const taskProgress = {
    completed: tasks.filter((task) => task.task_status === 1).length,
    total: tasks.length,
    percentage:
      tasks.length > 0
        ? (tasks.filter((task) => task.task_status === 1).length /
            tasks.length) *
          100
        : 0,
  };

  return (
    <div>
      {/* Merged Capstone/Adviser/Progress Container */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-100">
        {status === "loading" ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="flex items-center justify-between mb-4 mt-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="flex items-center gap-4">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-9 w-9 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-5" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full"></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ) : status === "no_group" ? (
          <div className="text-center text-red-500 py-8">
            You are not currently assigned to a group. Please contact your
            instructor to be assigned to a group.
          </div>
        ) : (
          <>
            {/* Capstone Title, Adviser, and Grade */}
            <div className="mb-1">
              <h2 className="text-2xl font-bold text-gray-900 break-words max-w-3xl tracking-tight">
                {displayCapstoneTitle}
              </h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(() => {
                  let adviserUI = null;
                  if (mode === "manager") {
                    if (adviser?.pending && adviser.pendingName) {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser: Pending Approval from {adviser.pendingName}
                          </span>
                          <button
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adviser.onCancel && adviser.onCancel()
                            }
                            disabled={isSubmitting}
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    } else if (adviser && adviser.first_name) {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: {adviser.first_name}{" "}
                          {adviser.middle_name ? adviser.middle_name + " " : ""}
                          {adviser.last_name}
                        </span>
                      );
                    } else {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser:
                          </span>
                          <button
                            className="px-2.5 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                            onClick={onShowAdviserPopup}
                            disabled={isSubmitting}
                          >
                            <FaPlus className="w-3 h-3" /> Enter adviser code
                          </button>
                        </div>
                      );
                    }
                  } else if (mode === "member") {
                    if (adviser?.pending && adviser.pendingName) {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser: Pending Approval from {adviser.pendingName}
                          </span>
                        </div>
                      );
                    } else if (adviser && adviser.first_name) {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: {adviser.first_name}{" "}
                          {adviser.middle_name ? adviser.middle_name + " " : ""}
                          {adviser.last_name}
                        </span>
                      );
                    } else {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: None
                        </span>
                      );
                    }
                  }
                  return adviserUI;
                })()}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-normal text-gray-700 bg-transparent">
                  Grade: {GRADE_MAP[grade ?? 0] || "No Grade"}
                </span>
                <button
                  className="text-gray-600 hover:text-gray-800 transition-colors p-2 border border-gray-200 rounded-full shadow-sm bg-white"
                  title="Download all documents"
                >
                  <FaDownload className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 mb-5" />

            {/* Combined Progress Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {/* Documentation Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Documentation Progress
                  </span>
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500 justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Approved
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Rejected
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                      In Review
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                      Not Submitted
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                  <div
                    className="bg-green-500 h-3 transition-all duration-300"
                    style={{ width: `${progress.approved}%` }}
                  ></div>
                  <div
                    className="bg-red-500 h-3 transition-all duration-300"
                    style={{ width: `${progress.rejected}%` }}
                  ></div>
                  <div
                    className="bg-yellow-400 h-3 transition-all duration-300"
                    style={{ width: `${progress.in_review}%` }}
                  ></div>
                  <div
                    className="bg-gray-300 h-3 transition-all duration-300"
                    style={{ width: `${progress.not_submitted}%` }}
                  ></div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleToggleDetails("documents")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {openDetails === "documents"
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                </div>
              </div>

              {/* Tasks Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Tasks Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {taskProgress.completed} / {taskProgress.total} Completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${taskProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleToggleDetails("tasks")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {openDetails === "tasks" ? "Hide Details" : "Show Details"}
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Details for Documents */}
            {openDetails === "documents" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-4">
                  Documentation Stats
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800">
                      Approved
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {statusCounts.approved}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statusCounts.rejected}
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">
                      In Review
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {statusCounts.in_review}
                    </p>
                  </div>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">
                      Not Submitted
                    </p>
                    <p className="text-2xl font-bold text-gray-600">
                      {statusCounts.not_submitted}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Details for Tasks */}
            {openDetails === "tasks" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-4">
                  Tasks Stats
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Completed
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {taskProgress.completed}
                        </p>
                      </div>
                      <div className="bg-green-100 p-2 rounded-full">
                        <FaCheck className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Incomplete
                        </p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {tasks.length - taskProgress.completed}
                        </p>
                      </div>
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <FaTimes className="w-4 h-4 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-gray-800 mb-4 mt-6">
                  Task Progress by Chapter
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CHAPTER_ORDER.map((chapter) => {
                    const chapterTasks = tasks.filter(
                      (task) => task.chapter === chapter,
                    );
                    if (chapterTasks.length === 0) return null;
                    const completedTasks = chapterTasks.filter(
                      (task) => task.task_status === 1,
                    ).length;
                    const totalTasks = chapterTasks.length;
                    const progressPercentage =
                      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    return (
                      <div key={chapter} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {chapter.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {completedTasks}/{totalTasks}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ease-in-out ${
                              progressPercentage === 100
                                ? "bg-green-500"
                                : progressPercentage > 50
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* End Merged Container */}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Document
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider relative"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <select
                        className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Last Modified
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 min-h-[80px]">
                {status === "loading" && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 pt-7 pb-1 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                )}
                {status === "no_group" && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 pt-7 pb-1 text-center text-red-500"
                    >
                      You are not currently assigned to a group. Please contact
                      your instructor to be assigned to a group.
                    </td>
                  </tr>
                )}
                {status === "error" && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 pt-7 pb-1 text-center text-red-500"
                    >
                      An error occurred while loading documents. Please try
                      again.
                    </td>
                  </tr>
                )}
                {status === "idle" &&
                  Array.isArray(documents) &&
                  documents.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No documents available.
                      </td>
                    </tr>
                  )}
                {status === "idle" &&
                  Array.isArray(documents) &&
                  documents.length > 0 &&
                  filteredDocuments.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No documents found.
                      </td>
                    </tr>
                  )}
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc._id}
                    className="hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {doc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[doc.status] || STATUS_COLORS[0]}`}
                      >
                        {STATUS_LABELS[doc.status] || STATUS_LABELS[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {formatLastModified(doc.last_modified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Document"
                        >
                          <FaEye className="w-5 h-5" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Download Document"
                        >
                          <FaDownload className="w-5 h-5" />
                        </button>
                        {canEditDocument(doc) && (
                          <button
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Edit Document"
                          >
                            <FaEdit className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
