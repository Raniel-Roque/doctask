import { FaEye, FaEdit, FaCheck } from "react-icons/fa";
import { useState } from "react";
import React from "react";

interface Task {
    _id: string;
    title: string;
    chapter: string;
    section: string;
    status: 'incomplete' | 'completed';
    assignedTo: string;
    lastModified?: number;
}

interface TaskAssignmentTableProps {
    tasks: Task[];
    status: 'loading' | 'error' | 'idle' | 'no_group';
    currentUserId: string;
    mode: 'manager' | 'member';
}

// Status color mapping
const STATUS_COLORS: { [key: string]: string } = {
    incomplete: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800"
};

// Status label mapping
const STATUS_LABELS: { [key: string]: string } = {
    incomplete: "Incomplete",
    completed: "Completed"
};

// All documents (excluding title page, appendix a, and appendix d)
const ALL_DOCUMENTS = [
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

// Chapter 1 sections
const CHAPTER_1_SECTIONS = [
    "1.1 Project Context",
    "1.2 Purpose and Description", 
    "1.3 Objectives",
    "1.4 Scope and Limitations"
];

// Chapter 3 sections
const CHAPTER_3_SECTIONS = [
    "3.1 Development",
    "3.2 Implementation"
];

// Chapter 4 sections
const CHAPTER_4_SECTIONS = [
    "4.1 Methodology",
    "4.2 Environment",
    "4.3 Requirements Specifications",
    "4.4 Design",
    "4.5 Development",
    "4.6 Verification, Validation, Testing",
    "4.7 Implementation Plan",
    "4.8 Installation Processes"
];

export const TaskAssignmentTable = ({
    tasks,
    status,
    currentUserId,
    mode
}: TaskAssignmentTableProps) => {
    // Add state for status filter and expanded chapters
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    // Filter tasks based on selected status
    const filteredTasks = tasks.filter(task => {
        const statusMatch = selectedStatus === "all" || task.status === selectedStatus;
        return statusMatch;
    });

    // Status options for the dropdown
    const statusOptions = [
        { value: "all", label: "STATUS" },
        { value: "incomplete", label: "INCOMPLETE" },
        { value: "completed", label: "COMPLETED" }
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

    // Generate tasks for all documents
    const generateTasks = () => {
        const allTasks: Task[] = [];
        
        // Generate regular documents
        ALL_DOCUMENTS.forEach((document, index) => {
            if (document === "chapter_1") {
                // Generate Chapter 1 with subparts
                CHAPTER_1_SECTIONS.forEach((section, sectionIndex) => {
                    allTasks.push({
                        _id: `chapter1-${sectionIndex}`,
                        title: section,
                        chapter: "chapter_1",
                        section: section,
                        status: 'incomplete',
                        assignedTo: mode === 'manager' ? currentUserId : "Unassigned",
                        lastModified: undefined
                    });
                });
            } else if (document === "chapter_3") {
                // Generate Chapter 3 with subparts
                CHAPTER_3_SECTIONS.forEach((section, sectionIndex) => {
                    allTasks.push({
                        _id: `chapter3-${sectionIndex}`,
                        title: section,
                        chapter: "chapter_3",
                        section: section,
                        status: 'incomplete',
                        assignedTo: mode === 'manager' ? currentUserId : "Unassigned",
                        lastModified: undefined
                    });
                });
            } else if (document === "chapter_4") {
                // Generate Chapter 4 with subparts
                CHAPTER_4_SECTIONS.forEach((section, sectionIndex) => {
                    allTasks.push({
                        _id: `chapter4-${sectionIndex}`,
                        title: section,
                        chapter: "chapter_4",
                        section: section,
                        status: 'incomplete',
                        assignedTo: mode === 'manager' ? currentUserId : "Unassigned",
                        lastModified: undefined
                    });
                });
            } else {
                // Generate regular documents
                allTasks.push({
                    _id: `${document}-${index}`,
                    title: document.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    chapter: document,
                    section: document,
                    status: 'incomplete',
                    assignedTo: mode === 'manager' ? currentUserId : "Unassigned",
                    lastModified: undefined
                });
            }
        });

        return allTasks;
    };

    // Use generated tasks if no tasks provided
    const displayTasks = tasks.length > 0 ? filteredTasks : generateTasks();

    // Group tasks by chapter
    const groupedTasks = displayTasks.reduce((acc, task) => {
        const chapter = task.chapter;
        if (!acc[chapter]) {
            acc[chapter] = [];
        }
        acc[chapter].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    // Check if user can edit the task
    const canEditTask = (task: Task) => {
        if (mode === 'manager') return true;
        return task.assignedTo === currentUserId;
    };

    // Check if user can view the task
    const canViewTask = (task: Task) => {
        if (mode === 'manager') return true;
        return task.assignedTo !== currentUserId;
    };

    // Check if chapter has subparts
    const hasSubparts = (chapter: string) => {
        return chapter === "chapter_1" || chapter === "chapter_3" || chapter === "chapter_4";
    };

    return (
        <div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6">
                    <div className="overflow-x-auto min-w-full">
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Task
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider relative">
                                        <div className="flex items-center justify-center gap-2">
                                            <select 
                                                className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                            >
                                                {statusOptions.map(option => (
                                                    <option 
                                                        key={option.value} 
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Assigned To
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 min-h-[80px]">
                                {status === 'loading' && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                )}
                                {status === 'no_group' && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-red-500">
                                            You are not currently assigned to a group. Please contact your instructor to be assigned to a group.
                                        </td>
                                    </tr>
                                )}
                                {status === 'error' && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-red-500">
                                            An error occurred while loading tasks. Please try again.
                                        </td>
                                    </tr>
                                )}
                                {status === 'idle' && Array.isArray(tasks) && tasks.length === 0 && displayTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            No tasks available.
                                        </td>
                                    </tr>
                                )}
                                {status === 'idle' && Array.isArray(tasks) && tasks.length > 0 && filteredTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            No tasks found.
                                        </td>
                                    </tr>
                                )}
                                {Object.entries(groupedTasks).map(([chapter, chapterTasks]) => (
                                    <React.Fragment key={chapter}>
                                        {/* Chapter header row (with actions and merged assigned users) */}
                                        {hasSubparts(chapter) ? (
                                            <>
                                                <tr className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => toggleChapter(chapter)}
                                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                                            >
                                                                {expandedChapters.has(chapter) ? '−' : '+'}
                                                            </button>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {chapter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS.incomplete}`}>
                                                            {STATUS_LABELS.incomplete}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                        {/* Merge assigned users from all subparts */}
                                                        {Array.from(new Set(chapterTasks.map(t => t.assignedTo === currentUserId ? "You" : t.assignedTo))).join(", ")}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            {mode === 'manager' ? (
                                                                <>
                                                                    <button 
                                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                        title="View Task"
                                                                    >
                                                                        <FaEye className="w-5 h-5" />
                                                                    </button>
                                                                    <button 
                                                                        className="text-green-600 hover:text-green-800 transition-colors"
                                                                        title="Submit Task"
                                                                    >
                                                                        <FaCheck className="w-5 h-5" />
                                                                    </button>
                                                                    <button 
                                                                        className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                        title="Edit Task"
                                                                    >
                                                                        <FaEdit className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                        title="View Task"
                                                                    >
                                                                        <FaEye className="w-5 h-5" />
                                                                    </button>
                                                                    <button 
                                                                        className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                        title="Edit Task"
                                                                    >
                                                                        <FaEdit className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Subparts rows (only if expanded) */}
                                                {expandedChapters.has(chapter) && chapterTasks.map((task) => (
                                                    <tr key={task._id} className="hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 ml-6">○ {task.title}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[task.status] || STATUS_COLORS.incomplete}`}>
                                                                {STATUS_LABELS[task.status] || STATUS_LABELS.incomplete}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                            {task.assignedTo === currentUserId ? "You" : task.assignedTo}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                            {/* No actions for subparts */}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        ) : (
                                            // Regular document header row (not expandable, with actions)
                                            <tr key={chapterTasks[0]._id} className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {chapterTasks[0].title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[chapterTasks[0].status] || STATUS_COLORS.incomplete}`}>
                                                        {STATUS_LABELS[chapterTasks[0].status] || STATUS_LABELS.incomplete}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                    {chapterTasks[0].assignedTo === currentUserId ? "You" : chapterTasks[0].assignedTo}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {mode === 'manager' ? (
                                                            <>
                                                                <button 
                                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                    title="View Task"
                                                                >
                                                                    <FaEye className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                                    title="Submit Task"
                                                                >
                                                                    <FaCheck className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                    title="Edit Task"
                                                                >
                                                                    <FaEdit className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {canViewTask(chapterTasks[0]) && (
                                                                    <button 
                                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                        title="View Task"
                                                                    >
                                                                        <FaEye className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                                {canEditTask(chapterTasks[0]) && (
                                                                    <button 
                                                                        className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                        title="Edit Task"
                                                                    >
                                                                        <FaEdit className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}; 