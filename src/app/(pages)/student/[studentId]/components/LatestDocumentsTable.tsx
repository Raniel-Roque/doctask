import { FaEye, FaDownload, FaEdit, FaPlus } from "react-icons/fa";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";

interface Document {
    _id: Id<"documents">;
    _creationTime: number;
    group_id: Id<"groupsTable">;
    part: string;
    room_id: string;
    title: string;
    content: string;
    student_ids: Id<"users">[];
    status: number;
    last_opened?: number;
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
    status: 'loading' | 'error' | 'idle' | 'no_group';
    currentUserId: Id<"users">;
    capstoneTitle?: string;
    grade?: number;
    adviser?: AdviserObj;
    onShowAdviserPopup: () => void;
    isSubmitting: boolean;
    mode: 'manager' | 'member';
}

// Grade mapping
const GRADE_MAP: { [key: number]: string } = {
    0: "No Grade",
    1: "Approved",
    2: "Approved With Revisions",
    3: "Disapproved",
    4: "Accepted With Revisions",
    5: "Reoral Defense",
    6: "Not Accepted"
};

// Status color mapping
const STATUS_COLORS: { [key: number]: string } = {
    0: "bg-yellow-100 text-yellow-800",
    1: "bg-blue-100 text-blue-800",
    2: "bg-green-100 text-green-800"
};

// Status label mapping
const STATUS_LABELS: { [key: number]: string } = {
    0: "Incomplete",
    1: "In Review",
    2: "Approved"
};

export const LatestDocumentsTable = ({
    documents,
    status,
    currentUserId,
    capstoneTitle,
    grade,
    adviser,
    onShowAdviserPopup,
    isSubmitting,
    mode
}: LatestDocumentsTableProps) => {
    // Add state for status filter
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    // Filter documents based on selected status
    const filteredDocuments = documents.filter(doc => {
        if (selectedStatus === "all") return true;
        return doc.status === parseInt(selectedStatus);
    });

    // Status options for the dropdown
    const statusOptions = [
        { value: "all", label: "STATUS" },
        { value: "0", label: "INCOMPLETE" },
        { value: "1", label: "IN REVIEW" },
        { value: "2", label: "APPROVED" }
    ];

    // Documents that are view/download only
    const viewOnlyDocuments = ["title_page", "appendix_a", "appendix_d"];

    // Check if user can edit the document
    const canEditDocument = (doc: Document) => {
        if (viewOnlyDocuments.includes(doc.part)) return false;
        return doc.student_ids.includes(currentUserId);
    };

    const displayCapstoneTitle = capstoneTitle && capstoneTitle.trim() !== '' ? capstoneTitle : 'Untitled Capstone Document';

    // Format last opened time
    const formatLastOpened = (timestamp?: number) => {
        if (!timestamp) return "Never";
        const date = new Date(timestamp);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    // Adviser UI logic
    let adviserUI = null;
    if (mode === 'manager') {
        if (adviser?.pending && adviser.pendingName) {
            adviserUI = (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Adviser: Pending Approval from {adviser.pendingName}</span>
                    <button
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        onClick={() => adviser.onCancel && adviser.onCancel()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            );
        } else if (adviser && adviser.first_name) {
            adviserUI = (
                <span className="text-sm text-gray-600">
                    Adviser: {adviser.first_name} {adviser.middle_name ? adviser.middle_name + ' ' : ''}{adviser.last_name}
                </span>
            );
        } else {
            adviserUI = (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Adviser:</span>
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
    } else if (mode === 'member') {
        if (adviser?.pending && adviser.pendingName) {
            adviserUI = (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Adviser: Pending Approval from {adviser.pendingName}</span>
                </div>
            );
        } else if (adviser && adviser.first_name) {
            adviserUI = (
                <span className="text-sm text-gray-600">
                    Adviser: {adviser.first_name} {adviser.middle_name ? adviser.middle_name + ' ' : ''}{adviser.last_name}
                </span>
            );
        } else {
            adviserUI = (
                <span className="text-sm text-gray-600">Adviser: None</span>
            );
        }
    }

    return (
        <div>
            {/* Capstone/Adviser/Grade and Progress/Controls Container */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-100">
                <div className="mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 break-words max-w-3xl tracking-tight">
                        {displayCapstoneTitle}
                    </h2>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {adviserUI}
                    </div>
                    <span className="text-sm font-normal text-gray-700 bg-transparent">
                        Grade: {GRADE_MAP[grade ?? 0] || "No Grade"}
                    </span>
                </div>

                <div className="border-b border-gray-200 mb-5" />

                {/* Progress Bar Row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                        <span className="text-sm text-gray-600">0%</span>
                    </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-gray-500 h-3 rounded-full transition-all duration-300" style={{ width: "0%" }}></div>
                        </div>
                    </div>
                    <button 
                        className="text-gray-600 hover:text-gray-800 transition-colors p-2 border border-gray-200 rounded-full shadow-sm bg-white"
                        title="Download all documents"
                    >
                        <FaDownload className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {/* End Capstone/Adviser/Grade and Progress/Controls Container */}

            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6">
                    <div className="overflow-x-auto min-w-full">
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Document
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
                                        Last Opened
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
                                            An error occurred while loading documents. Please try again.
                                        </td>
                                    </tr>
                                )}
                                {status === 'idle' && Array.isArray(documents) && documents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            No documents available.
                                        </td>
                                    </tr>
                                )}
                                {status === 'idle' && Array.isArray(documents) && documents.length > 0 && filteredDocuments.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 pt-7 pb-1 text-center text-gray-500">
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
                                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[doc.status] || STATUS_COLORS[0]}`}>
                                                {STATUS_LABELS[doc.status] || STATUS_LABELS[0]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                            {formatLastOpened(doc.last_opened)}
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