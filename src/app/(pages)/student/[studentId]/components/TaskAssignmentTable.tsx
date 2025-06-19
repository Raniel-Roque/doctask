import { FaEye, FaEdit, FaCheck, FaPlus, FaTimes, FaDownload } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import React from "react";

interface Task {
    _id: string;
    title: string;
    chapter: string;
    section: string;
    status: 'incomplete' | 'completed';
    assignedTo: string[];
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

// Available members for assignment
const AVAILABLE_MEMBERS = ["User1", "User2", "User3"];

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
    
    // Add state for member assignments
    const [memberAssignments, setMemberAssignments] = useState<Record<string, string[]>>({});
    const [showMemberSelector, setShowMemberSelector] = useState<string | null>(null);
    // Add search state per chapter
    const [search, setSearch] = useState<Record<string, string>>({});
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Get available members for a specific chapter (excluding already assigned ones)
    const getAvailableMembers = (chapter: string) => {
        const assignedMembers = memberAssignments[chapter] || [];
        return AVAILABLE_MEMBERS.filter(member => !assignedMembers.includes(member));
    };

    // Add member to chapter
    const addMemberToChapter = (chapter: string, member: string) => {
        setMemberAssignments(prev => ({
            ...prev,
            [chapter]: [...(prev[chapter] || []), member]
        }));
    };

    // Remove member from chapter
    const removeMemberFromChapter = (chapter: string, member: string) => {
        setMemberAssignments(prev => ({
            ...prev,
            [chapter]: (prev[chapter] || []).filter(m => m !== member)
        }));
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
                        assignedTo: [],
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
                        assignedTo: [],
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
                        assignedTo: [],
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
                    assignedTo: [],
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
        return task.assignedTo.includes(currentUserId);
    };

    // Check if chapter has subparts
    const hasSubparts = (chapter: string) => {
        return chapter === "chapter_1" || chapter === "chapter_3" || chapter === "chapter_4";
    };

    // Get assigned members for a chapter
    const getAssignedMembers = (chapter: string) => {
        return memberAssignments[chapter] || [];
    };

    // Helper to get merged, deduped, sorted members from all subparts
    const getMergedSubpartMembers = (chapter: string, chapterTasks: Task[]) => {
        const allMembers = chapterTasks.flatMap(task => getAssignedMembers(task._id));
        return Array.from(new Set(allMembers)).sort();
    };

    // Render member assignment UI
    const renderMemberAssignment = (chapter: string) => {
        const assignedMembers = [...getAssignedMembers(chapter)].sort();
        const availableMembers = getAvailableMembers(chapter);
        const allAssigned = availableMembers.length === 0;
        const searchValue = search[chapter] || "";
        const filteredMembers = availableMembers.filter(member =>
            member.toLowerCase().includes(searchValue.toLowerCase())
        );

        return (
            <div className="flex justify-center w-full">
                <div className="flex flex-wrap items-center gap-2">
                    {assignedMembers.map((member, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                            {member}
                            {mode === 'manager' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeMemberFromChapter(chapter, member);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    <FaTimes className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    ))}
                    {mode === 'manager' && !allAssigned && (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMemberSelector(chapter);
                                    setSearch(prev => ({ ...prev, [chapter]: "" }));
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                            >
                                <FaPlus className="w-3 h-3" />
                                Add Member
                            </button>
                            {showMemberSelector === chapter && (
                                <div ref={dropdownRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px] p-2">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchValue}
                                        onChange={e => setSearch(prev => ({ ...prev, [chapter]: e.target.value }))}
                                        placeholder="Search members..."
                                        className="w-full mb-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                                    />
                                    {filteredMembers.length > 0 ? (
                                        filteredMembers.map((member) => (
                                            <button
                                                key={member}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addMemberToChapter(chapter, member);
                                                    setShowMemberSelector(null);
                                                }}
                                                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                                            >
                                                {member}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-xs text-gray-400 px-3 py-2">No members found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
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
                                        {hasSubparts(chapter) ? (
                                            <>
                                                {/* Main chapter header: whole row clickable for collapse/expand */}
                                                <tr
                                                    className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer"
                                                    onClick={() => toggleChapter(chapter)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">
                                                                {expandedChapters.has(chapter) ? '−' : '+'}
                                                            </span>
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
                                                        <div className="flex flex-wrap justify-center gap-2">
                                                            {getMergedSubpartMembers(chapter, chapterTasks).length > 0 ? (
                                                                getMergedSubpartMembers(chapter, chapterTasks).map((member, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                                                    >
                                                                        {member}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">No members assigned</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button 
                                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                title="View Task"
                                                            >
                                                                <FaEye className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                className="text-download-600 hover:text-download-800 transition-colors"
                                                                title="Download Task"
                                                            >
                                                                <FaDownload className="w-5 h-5" />
                                                            </button>
                                                            {canEditTask(chapterTasks[0]) && (
                                                                <button 
                                                                    className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                    title="Edit Task"
                                                                >
                                                                    <FaEdit className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            {mode === 'manager' && (
                                                                <button 
                                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                                    title="Submit Task"
                                                                >
                                                                    <FaCheck className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Subparts rows: show member assignment UI for each subpart */}
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
                                                            {renderMemberAssignment(task._id)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                            {/* No actions for subparts */}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        ) : (
                                            // Regular document header row (not expandable, with actions)
                                            <tr key={chapterTasks[0]._id} className="bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out">
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
                                                    {renderMemberAssignment(chapter)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button 
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                            title="View Task"
                                                        >
                                                            <FaEye className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            className="text-download-600 hover:text-download-800 transition-colors"
                                                            title="Download Task"
                                                        >
                                                            <FaDownload className="w-5 h-5" />
                                                        </button>
                                                        {canEditTask(chapterTasks[0]) && (
                                                            <button 
                                                                className="text-purple-600 hover:text-purple-800 transition-colors"
                                                                title="Edit Task"
                                                            >
                                                                <FaEdit className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        {mode === 'manager' && (
                                                            <button 
                                                                className="text-green-600 hover:text-green-800 transition-colors"
                                                                title="Submit Task"
                                                            >
                                                                <FaCheck className="w-5 h-5" />
                                                            </button>
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