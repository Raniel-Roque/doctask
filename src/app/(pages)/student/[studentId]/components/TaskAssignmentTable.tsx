import {
  FaEye,
  FaEdit,
  FaCheck,
  FaPlus,
  FaTimes,
  FaDownload,
  FaChevronDown,
} from "react-icons/fa";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Image from "next/image";

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

interface TaskAssignmentTableProps {
  tasks: Task[];
  status: "loading" | "error" | "idle" | "no_group";
  currentUserId: string;
  mode: "manager" | "member";
  groupMembers?: Array<{
    _id: Id<"users">;
    first_name: string;
    last_name: string;
    email: string;
    clerk_id: string;
    isProjectManager: boolean;
  }>;
  onStatusChange?: (taskId: string, newStatus: number) => void;
}

// Status color mapping for task_status (member/manager communication)
const STATUS_COLORS: { [key: number]: string } = {
  0: "bg-yellow-100 text-yellow-800", // incomplete
  1: "bg-green-100 text-green-800", // completed
};

// Status label mapping for task_status
const STATUS_LABELS: { [key: number]: string } = {
  0: "Incomplete",
  1: "Completed",
};

// Helper function to join array items with commas and 'and'
const formatList = (items: string[]) => {
  if (items.length <= 1) return items.join("");
  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return `${allButLast.join(", ")} and ${last}`;
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

export const TaskAssignmentTable = ({
  tasks,
  status,
  currentUserId,
  mode,
  groupMembers,
  onStatusChange,
}: TaskAssignmentTableProps) => {
  // Add Convex mutations
  const updateTaskStatus = useMutation(api.mutations.updateTaskStatus);
  const updateTaskAssignment = useMutation(api.mutations.updateTaskAssignment);

  // Add state for status filter and expanded chapters
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );

  // Add state for member selector UI
  const [showMemberSelector, setShowMemberSelector] = useState<string | null>(
    null
  );
  // Add search state per chapter
  const [search, setSearch] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add loading states
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingAssignment, setUpdatingAssignment] = useState<string | null>(
    null
  );

  // Add state for profile images
  const [profileImages, setProfileImages] = useState<Record<string, string>>(
    {}
  );
  const [profileImagesLoading, setProfileImagesLoading] = useState(true);
  const [memberOverviewExpanded, setMemberOverviewExpanded] = useState(false);

  // Create a stable dependency from the members list
  const memberIds = useMemo(() => {
    return groupMembers
      ?.map((m) => m._id)
      .sort()
      .join(",");
  }, [groupMembers]);

  // Fetch profile images only when the members change
  useEffect(() => {
    const fetchImages = async () => {
      if (!groupMembers || groupMembers.length === 0) {
        setProfileImagesLoading(false);
        return;
      }
      setProfileImagesLoading(true);
      try {
        const userIds = groupMembers.map((member) => member._id);
        const response = await fetch("/api/clerk/get-profile-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profileImages) {
            setProfileImages(data.profileImages);
          }
        }
      } finally {
        setProfileImagesLoading(false);
      }
    };

    if (memberIds) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIds]);

  useEffect(() => {
    if (showMemberSelector && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMemberSelector]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMemberSelector) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMemberSelector(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMemberSelector]);

  // Filter tasks based on selected status
  const filteredTasks = tasks.filter((task) => {
    const statusMatch =
      selectedStatus === "all" || task.task_status === parseInt(selectedStatus);
    return statusMatch;
  });

  // Status options for the dropdown
  const statusOptions = [
    { value: "all", label: "STATUS" },
    { value: "0", label: "INCOMPLETE" },
    { value: "1", label: "COMPLETED" },
  ];

  // Toggle chapter expansion
  const toggleChapter = (chapter: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapter)) {
      newExpanded.delete(chapter);
    } else {
      newExpanded.add(chapter);
    }
    setExpandedChapters(newExpanded);
  };

  // Get available members for a specific task
  const getAvailableMembers = useCallback(
    (taskId: Id<"taskAssignments">) => {
      const assignedMembers =
        tasks.find((t) => t._id === taskId)?.assigned_student_ids || [];
      return (
        groupMembers?.filter(
          (member) =>
            !assignedMembers.includes(member._id) && !member.isProjectManager
        ) || []
      );
    },
    [tasks, groupMembers]
  );

  // Add member to task
  const addMemberToTask = async (
    taskId: Id<"taskAssignments">,
    memberId: Id<"users">
  ) => {
    try {
      setUpdatingAssignment(taskId);

      // Find the task
      const task = tasks.find((t) => t._id === taskId);
      if (!task) {
        return;
      }

      // Get current assignments and add the new member
      const currentAssignments = task.assigned_student_ids || [];
      const newAssignments = [...currentAssignments, memberId];

      // Call the Convex mutation
      await updateTaskAssignment({
        taskId: task._id,
        assignedStudentIds: newAssignments,
        userId: currentUserId as Id<"users">,
      });
    } finally {
      setUpdatingAssignment(null);
    }
  };

  // Remove member from task
  const removeMemberFromTask = async (
    taskId: Id<"taskAssignments">,
    memberId: Id<"users">
  ) => {
    try {
      setUpdatingAssignment(taskId);

      // Find the task
      const task = tasks.find((t) => t._id === taskId);
      if (!task) {
        return;
      }

      // Get current assignments and remove the member
      const currentAssignments = task.assigned_student_ids || [];
      const newAssignments = currentAssignments.filter((id) => id !== memberId);

      // Call the Convex mutation
      await updateTaskAssignment({
        taskId: task._id,
        assignedStudentIds: newAssignments,
        userId: currentUserId as Id<"users">,
      });
    } finally {
      setUpdatingAssignment(null);
    }
  };

  // Group tasks by chapter
  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      const chapter = task.chapter;
      if (!acc[chapter]) {
        acc[chapter] = [];
      }
      acc[chapter].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  // Create sorted grouped tasks to maintain the correct chapter order
  const sortedGroupedTasks = Object.fromEntries(
    CHAPTER_ORDER.filter((chapter) => groupedTasks[chapter]) // Only include chapters that have tasks
      .map((chapter) => [chapter, groupedTasks[chapter]])
  );

  // Check if user can edit the task
  const canEditTask = (task: Task) => {
    if (mode === "manager") return true;
    return task.assigned_student_ids.includes(currentUserId as Id<"users">);
  };

  // Check if user can Edit Document status
  const canEditTaskStatus = (task: Task) => {
    if (mode === "manager") return true;
    return task.assigned_student_ids.includes(currentUserId as Id<"users">);
  };

  // Check if chapter has subparts
  const hasSubparts = (chapter: string) => {
    const chapterTasks = sortedGroupedTasks[chapter] || [];
    return chapterTasks.length > 1;
  };

  // Get chapter status based on subparts completion
  const getChapterStatus = (chapter: string, chapterTasks: Task[]) => {
    if (!hasSubparts(chapter)) {
      // For regular documents, return the task's status
      return chapterTasks[0]?.task_status || 0;
    }

    // For chapters with subparts, check if all subparts are completed
    const allCompleted = chapterTasks.every((task) => task.task_status === 1);
    return allCompleted ? 1 : 0;
  };

  // Handle status change
  const handleStatusChange = async (taskId: string, newStatus: number) => {
    try {
      setUpdatingStatus(taskId);

      // Call the Convex mutation
      await updateTaskStatus({
        taskId: taskId as Id<"taskAssignments">,
        newStatus,
        userId: currentUserId as Id<"users">,
      });

      // Call the parent callback if provided
      if (onStatusChange) {
        onStatusChange(taskId, newStatus);
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Helper to get merged, deduped, sorted members from all subparts
  const getMergedSubpartMembers = (chapter: string, chapterTasks: Task[]) => {
    const allMemberIds = chapterTasks.flatMap(
      (task) => task.assigned_student_ids
    );
    const uniqueMemberIds = Array.from(new Set(allMemberIds));

    // Convert member IDs to member objects
    return uniqueMemberIds
      .map((memberId) => {
        return groupMembers?.find((m) => m._id === memberId);
      })
      .filter(Boolean) as {
      _id: Id<"users">;
      first_name: string;
      last_name: string;
    }[];
  };

  // Render member assignment UI
  const renderMemberAssignment = (task: Task) => {
    const assignedMemberIds = task.assigned_student_ids.sort();
    const availableMembers = getAvailableMembers(task._id);
    const allAssigned = availableMembers.length === 0;
    const searchValue = search[task._id] || "";
    const filteredMembers = availableMembers.filter((member) =>
      `${member.first_name} ${member.last_name}`
        .toLowerCase()
        .includes(searchValue.toLowerCase())
    );
    const isLoading = updatingAssignment === task._id;

    return (
      <div className="flex justify-center w-full">
        <div className="flex flex-wrap items-center gap-2">
          {assignedMemberIds.length > 0
            ? assignedMemberIds.map((memberId) => {
                const member = groupMembers?.find((m) => m._id === memberId);
                if (!member) return null;

                const isCurrentUser = memberId === currentUserId;
                const pillColor =
                  mode === "member" && isCurrentUser
                    ? "bg-purple-200 text-purple-900"
                    : "bg-blue-100 text-blue-800";

                return (
                  <span
                    key={memberId}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${pillColor}`}
                  >
                    {member.first_name} {member.last_name}
                    {mode === "manager" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMemberFromTask(task._id, memberId);
                        }}
                        disabled={isLoading}
                        className={`text-blue-600 hover:text-blue-800 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })
            : mode === "member" && (
                <span className="text-gray-400 text-xs">
                  No members assigned
                </span>
              )}
          {mode === "manager" && !allAssigned && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMemberSelector(task._id);
                  setSearch((prev) => ({ ...prev, [task._id]: "" }));
                }}
                disabled={isLoading}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FaPlus className="w-3 h-3" />
                Add Member
              </button>
              {showMemberSelector === task._id && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px] p-2"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) =>
                      setSearch((prev) => ({
                        ...prev,
                        [task._id]: e.target.value,
                      }))
                    }
                    placeholder="Search members..."
                    className="w-full mb-2 px-2 py-1 text-xs border rounded bg-white text-gray-700 shadow-sm"
                  />
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <button
                        key={member._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          addMemberToTask(task._id, member._id);
                          setShowMemberSelector(null);
                        }}
                        disabled={isLoading}
                        className={`block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {member.first_name} {member.last_name}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 px-3 py-2">
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500">Updating...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render status dropdown
  const renderStatusDropdown = (task: Task) => {
    const canEdit = canEditTaskStatus(task);
    const currentStatus = task.task_status;
    const isLoading = updatingStatus === task._id;

    if (!canEdit) {
      // Show read-only status badge
      return (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[currentStatus] || STATUS_COLORS[0]}`}
        >
          {STATUS_LABELS[currentStatus] || STATUS_LABELS[0]}
        </span>
      );
    }

    // Show editable dropdown with chevron
    return (
      <div className="relative inline-block">
        <select
          value={currentStatus}
          onChange={(e) =>
            handleStatusChange(task._id, parseInt(e.target.value))
          }
          disabled={isLoading}
          className={`px-2 py-1 pr-6 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none ${STATUS_COLORS[currentStatus] || STATUS_COLORS[0]} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <option value={0} className="bg-yellow-100 text-yellow-800">
            Incomplete
          </option>
          <option value={1} className="bg-green-100 text-green-800">
            Completed
          </option>
        </select>
        <FaChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs pointer-events-none" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  };

  const sortedMembers = useMemo(() => {
    if (!groupMembers) return [];

    // Filter out the project manager from the list
    const members = groupMembers.filter((member) => !member.isProjectManager);
    const currentUser = members.find((m) => m._id === currentUserId);

    // Sort all non-PM members alphabetically by first name
    const sorted = members.sort((a, b) =>
      a.first_name.localeCompare(b.first_name)
    );

    // If the current user isn't a regular member (i.e., they are the PM), return the sorted list as is.
    if (!currentUser) {
      return sorted;
    }

    // Otherwise, pull the current user to the front of the list.
    return [currentUser, ...sorted.filter((m) => m._id !== currentUserId)];
  }, [groupMembers, currentUserId]);

  return (
    <div>
      {/* Member Overview Section */}
      {status === "idle" && profileImagesLoading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100 text-center text-gray-500">
          Loading members...
        </div>
      )}
      {status === "idle" &&
        !profileImagesLoading &&
        groupMembers &&
        groupMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setMemberOverviewExpanded(!memberOverviewExpanded)}
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Member Overview
              </h3>
              <span className="text-gray-500 text-xl font-light">
                {memberOverviewExpanded ? "−" : "+"}
              </span>
            </div>

            {memberOverviewExpanded && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMembers.map((member) => {
                  const assignedTasks = tasks
                    .filter((task) =>
                      task.assigned_student_ids.includes(member._id)
                    )
                    .sort((a, b) => {
                      const indexA = CHAPTER_ORDER.indexOf(a.chapter);
                      const indexB = CHAPTER_ORDER.indexOf(b.chapter);
                      if (indexA === -1 && indexB === -1)
                        return a.chapter.localeCompare(b.chapter);
                      if (indexA === -1) return 1;
                      if (indexB === -1) return -1;
                      return indexA - indexB;
                    });

                  const completedTasks = assignedTasks.filter(
                    (task) => task.task_status === 1
                  ).length;
                  const totalTasks = assignedTasks.length;

                  const getDisplayItems = () => {
                    if (totalTasks === 0) return [];

                    const otherItems: { title: string; index: number }[] = [];
                    const chapterNumbers: string[] = [];
                    const appendixLetters: string[] = [];
                    let firstChapterIndex = -1;
                    let firstAppendixIndex = -1;

                    assignedTasks.forEach((task, index) => {
                      if (task.chapter.startsWith("chapter_")) {
                        if (firstChapterIndex === -1) firstChapterIndex = index;
                        const num = task.chapter.split("_")[1];
                        if (!chapterNumbers.includes(num))
                          chapterNumbers.push(num);
                      } else if (task.chapter.startsWith("appendix_")) {
                        if (firstAppendixIndex === -1)
                          firstAppendixIndex = index;
                        const letter = task.chapter.split("_")[1].toUpperCase();
                        if (!appendixLetters.includes(letter))
                          appendixLetters.push(letter);
                      } else {
                        const title = task.title
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                        if (!otherItems.some((i) => i.title === title)) {
                          otherItems.push({ title, index });
                        }
                      }
                    });

                    const finalItems: { title: string; index: number }[] = [
                      ...otherItems,
                    ];
                    if (chapterNumbers.length > 0) {
                      finalItems.push({
                        title: `Chapter ${formatList(chapterNumbers.sort((a, b) => parseInt(a) - parseInt(b)))}`,
                        index: firstChapterIndex,
                      });
                    }
                    if (appendixLetters.length > 0) {
                      finalItems.push({
                        title: `Appendix ${formatList(appendixLetters.sort())}`,
                        index: firstAppendixIndex,
                      });
                    }

                    return finalItems
                      .sort((a, b) => a.index - b.index)
                      .map((i) => i.title);
                  };

                  const finalDisplayItems = getDisplayItems();

                  return (
                    <div
                      key={member._id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {profileImages[member.clerk_id] ? (
                            <Image
                              src={profileImages[member.clerk_id]}
                              alt={`${member.first_name} ${member.last_name}`}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-100 text-blue-800">
                              {member.first_name.charAt(0)}
                              {member.last_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {`${member.first_name} ${member.last_name}`}
                              {member._id === currentUserId && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm">
                          {totalTasks > 0 ? (
                            <>
                              <span className="font-semibold text-gray-800">
                                {completedTasks} / {totalTasks}
                              </span>
                              <span className="text-gray-500 ml-1">
                                {totalTasks === 1 ? "Task" : "Tasks"}
                              </span>
                            </>
                          ) : (
                            <span>
                              <span className="font-semibold text-gray-800">
                                0
                              </span>
                              <span className="text-gray-500 ml-1">Tasks</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 mt-2 border-t pt-2">
                          {totalTasks > 0 ? (
                            <>
                              <span className="font-medium text-gray-700">
                                Assigned:
                              </span>
                              {finalDisplayItems.map((item, index) => (
                                <div key={index} className="truncate pl-2">
                                  • {item}
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="italic text-center text-gray-400">
                              No tasks assigned
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                    Task
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider relative"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <select
                        className="ml-2 px-2 py-1 text-xs border rounded bg-white text-gray-700 shadow-sm"
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
                    Assigned To
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
                      An error occurred while loading tasks. Please try again.
                    </td>
                  </tr>
                )}
                {status === "idle" &&
                  Array.isArray(tasks) &&
                  tasks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No tasks available.
                      </td>
                    </tr>
                  )}
                {status === "idle" &&
                  Array.isArray(tasks) &&
                  tasks.length > 0 &&
                  filteredTasks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No tasks found.
                      </td>
                    </tr>
                  )}
                {status === "idle" &&
                  Object.keys(sortedGroupedTasks).map((chapter) => {
                    const chapterTasks = sortedGroupedTasks[chapter] || [];
                    return (
                      <React.Fragment key={chapter}>
                        {hasSubparts(chapter) ? (
                          <>
                            {/* Main chapter header: whole row clickable for collapse/expand */}
                            <tr
                              key={`${chapter}-header`}
                              className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer"
                              onClick={() => toggleChapter(chapter)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">
                                    {expandedChapters.has(chapter) ? "−" : "+"}
                                  </span>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {chapter
                                      .replace(/_/g, " ")
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[getChapterStatus(chapter, chapterTasks)] || STATUS_COLORS[0]}`}
                                >
                                  {STATUS_LABELS[
                                    getChapterStatus(chapter, chapterTasks)
                                  ] || STATUS_LABELS[0]}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <div className="flex flex-wrap justify-center gap-2">
                                  {getMergedSubpartMembers(
                                    chapter,
                                    chapterTasks
                                  ).length > 0 ? (
                                    getMergedSubpartMembers(
                                      chapter,
                                      chapterTasks
                                    ).map((member) => {
                                      const isCurrentUser =
                                        member._id === currentUserId;
                                      const pillColor =
                                        mode === "member" && isCurrentUser
                                          ? "bg-purple-200 text-purple-900"
                                          : "bg-blue-100 text-blue-800";
                                      return (
                                        <span
                                          key={member._id}
                                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${pillColor}`}
                                        >
                                          {member.first_name} {member.last_name}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-gray-400 text-xs">
                                      No members assigned
                                    </span>
                                  )}
                                </div>
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
                                    className="text-download-600 hover:text-download-800 transition-colors"
                                    title="Download Document"
                                  >
                                    <FaDownload className="w-5 h-5" />
                                  </button>
                                  {canEditTask(chapterTasks[0]) && (
                                    <button
                                      className="text-purple-600 hover:text-purple-800 transition-colors"
                                      title="Edit Document"
                                    >
                                      <FaEdit className="w-5 h-5" />
                                    </button>
                                  )}
                                  {mode === "manager" &&
                                    getChapterStatus(chapter, chapterTasks) ===
                                      1 && (
                                      <button
                                        className="text-green-600 hover:text-green-800 transition-colors"
                                        title="Submit Document"
                                      >
                                        <FaCheck className="w-5 h-5" />
                                      </button>
                                    )}
                                </div>
                              </td>
                            </tr>
                            {/* Subparts rows: show member assignment UI for each subpart */}
                            {expandedChapters.has(chapter) &&
                              chapterTasks.map((task) => (
                                <tr
                                  key={`${task._id}-subpart`}
                                  className="hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 ml-6">
                                      ○ {task.title}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {renderStatusDropdown(task)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {renderMemberAssignment(task)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {/* No actions for subparts */}
                                  </td>
                                </tr>
                              ))}
                          </>
                        ) : (
                          // Regular document header row (not expandable, with actions)
                          <tr
                            key={`${chapterTasks[0]._id}-regular`}
                            className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {chapterTasks[0].title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {renderStatusDropdown(chapterTasks[0])}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                              {renderMemberAssignment(chapterTasks[0])}
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
                                  className="text-download-600 hover:text-download-800 transition-colors"
                                  title="Download Document"
                                >
                                  <FaDownload className="w-5 h-5" />
                                </button>
                                {canEditTask(chapterTasks[0]) && (
                                  <button
                                    className="text-purple-600 hover:text-purple-800 transition-colors"
                                    title="Edit Document"
                                  >
                                    <FaEdit className="w-5 h-5" />
                                  </button>
                                )}
                                {mode === "manager" &&
                                  chapterTasks[0].task_status === 1 && (
                                    <button
                                      className="text-green-600 hover:text-green-800 transition-colors"
                                      title="Submit Document"
                                    >
                                      <FaCheck className="w-5 h-5" />
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
