import { FaEye, FaDownload, FaEdit } from "react-icons/fa";
import { Id } from "../../../../../../../../convex/_generated/dataModel";

interface Document {
    _id: Id<"documents">;
    _creationTime: number;
    group_id: Id<"groupsTable">;
    part: string;
    room_id: string;
    title: string;
    content: string;
    student_ids: Id<"users">[];
}

interface LatestDocumentsTableProps {
    documents: Document[];
    status: 'loading' | 'error' | 'idle' | 'no_group';
    hasResults: boolean;
    currentUserId: Id<"users">;
    capstoneTitle?: string;
    grade?: number;
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

export const LatestDocumentsTable = ({
    documents,
    status,
    hasResults,
    currentUserId,
    capstoneTitle,
    grade
}: LatestDocumentsTableProps) => {
    // Status options for the dropdown
    const statusOptions = [
        { value: "all", label: "All Status" },
        { value: "incomplete", label: "Incomplete", color: "bg-yellow-100 text-yellow-800" },
        { value: "in_review", label: "In Review", color: "bg-blue-100 text-blue-800" },
        { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" }
    ];

    // Documents that are view/download only
    const viewOnlyDocuments = ["title_page", "appendix_a", "appendix_d"];

    // Check if user can edit the document
    const canEditDocument = (doc: Document) => {
        if (viewOnlyDocuments.includes(doc.part)) return false;
        return doc.student_ids.includes(currentUserId);
    };

    const displayCapstoneTitle = capstoneTitle && capstoneTitle.trim() !== '' ? capstoneTitle : 'Untitled Capstone Document';

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold break-words max-w-3xl">
                    {displayCapstoneTitle}
                </h2>
                <div className="flex items-center gap-4">
                    {grade !== undefined && (
                        <span className="text-sm font-medium text-gray-700">
                            Grade: {GRADE_MAP[grade] || "No Grade"}
                        </span>
                    )}
                    <select 
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue="all"
                    >
                        {statusOptions.map(option => (
                            <option 
                                key={option.value} 
                                value={option.value}
                                className={option.color}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Document
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {status === 'loading' && (
                                    <tr>
                                        <td colSpan={3} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                )}
                                {status === 'no_group' && (
                                    <tr>
                                        <td colSpan={3} className="px-6 pt-7 pb-1 text-center text-red-500">
                                            You are not currently assigned to a group. Please contact your instructor to be assigned to a group.
                                        </td>
                                    </tr>
                                )}
                                {status === 'error' && (
                                    <tr>
                                        <td colSpan={3} className="px-6 pt-7 pb-1 text-center text-red-500">
                                            An error occurred while loading documents. Please try again.
                                        </td>
                                    </tr>
                                )}
                                {status === 'idle' && !hasResults && (
                                    <tr>
                                        <td colSpan={3} className="px-6 pt-7 pb-1 text-center text-gray-500">
                                            No documents found.
                                        </td>
                                    </tr>
                                )}
                                {documents.map((doc) => (
                                    <tr 
                                        key={doc._id} 
                                        className="hover:bg-gray-100 hover:border-l-4 hover:border-blue-400 transition-colors duration-150 ease-in-out cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Incomplete
                                            </span>
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