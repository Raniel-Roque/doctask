"use client";

import { Navbar } from "../../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useState, useEffect, use } from "react";
import { FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaKey, FaSearch, FaTimes, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { useMutation } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UsersPageProps {
  params: Promise<{ adminId: string }>;
}

interface Adviser {
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

interface EditFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

interface AddFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

const TABLE_CONSTANTS = {
  STATUS_FILTERS: {
    ALL: "all",
    VERIFIED: "verified",
    PENDING: "pending",
  },
  DEFAULT_SORT_FIELD: "first_name" as const,
  DEFAULT_SORT_DIRECTION: "asc" as const,
};

type SortField = "first_name" | "last_name" | "email" | "_creationTime";
type SortDirection = "asc" | "desc";

const UsersPage = ({ params }: UsersPageProps) => {
  const { adminId } = use(params);
  const [advisers, setAdvisers] = useState<Adviser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]>(TABLE_CONSTANTS.STATUS_FILTERS.ALL);
  const [sortField, setSortField] = useState<SortField>(TABLE_CONSTANTS.DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<SortDirection>(TABLE_CONSTANTS.DEFAULT_SORT_DIRECTION);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<Adviser | null>(null);
  const [deleteUser, setDeleteUser] = useState<Adviser | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
  });
  const [addFormData, setAddFormData] = useState<AddFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
  });

  const updateUser = useMutation(api.documents.updateUser);
  const deleteUserMutation = useMutation(api.documents.deleteUser);
  const createUser = useMutation(api.documents.createUser);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Add useEffect for page leave warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);

  const refreshAdvisers = async () => {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const data = await client.query(api.documents.getAdvisers);
    setAdvisers(data || []);
  };

  useEffect(() => {
    refreshAdvisers();
  }, []);

  const handleSort = (
    field: SortField,
    currentField: SortField,
    currentDirection: SortDirection,
    setField: (field: SortField) => void,
    setDirection: (direction: SortDirection) => void
  ) => {
    if (field === currentField) {
      setDirection(currentDirection === "asc" ? "desc" : "asc");
    } else {
      setField(field);
      setDirection("asc");
    }
  };

  const getSortIcon = (field: SortField, currentField: SortField, currentDirection: SortDirection) => {
    if (field !== currentField) return <FaSort />;
    return currentDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const filterAndSortAdvisers = (
    advisers: Adviser[],
    searchTerm: string,
    statusFilter: string,
    sortField: SortField,
    sortDirection: SortDirection
  ) => {
    const filtered = advisers.filter((adviser) => {
      const matchesSearch = searchTerm === "" ||
        adviser.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adviser.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adviser.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.ALL ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED && adviser.email_verified) ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.PENDING && !adviser.email_verified);

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "_creationTime") {
        comparison = a[sortField] - b[sortField];
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const getPaginationInfo = (advisers: Adviser[], currentPage: number) => {
    const entriesPerPage = 10;
    const totalEntries = advisers.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startEntry = (currentPage - 1) * entriesPerPage + 1;
    const endEntry = Math.min(startEntry + entriesPerPage - 1, totalEntries);
    const paginatedAdvisers = advisers.slice(startEntry - 1, endEntry);

    return {
      totalEntries,
      totalPages,
      startEntry,
      endEntry,
      paginatedAdvisers,
    };
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(advisers.length / 10)) {
      setCurrentPage(newPage);
    }
  };

  const validateEditForm = (formData: EditFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
    return null;
  };

  const handleEdit = (adviser: Adviser) => {
    setEditingUser(adviser);
    setEditFormData({
      first_name: adviser.first_name,
      middle_name: adviser.middle_name || "",
      last_name: adviser.last_name,
      email: adviser.email,
    });
  };

  const handleEditSubmit = async () => {
    if (!editingUser) return;

    const error = validateEditForm(editFormData);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await updateUser({
        userId: editingUser._id,
        adminId: adminId as Id<"users">,
        ...editFormData,
      });
      setEditingUser(null);
      await refreshAdvisers();
      setNotification({
        type: 'success',
        message: 'Adviser information updated successfully'
      });
    } catch (error) {
      console.error("Error updating user:", error);
      setValidationError("Failed to update user. Please try again.");
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUser) return;

    try {
      await deleteUserMutation({
        userId: deleteUser._id,
        adminId: adminId as Id<"users">,
      });
      setDeleteUser(null);
      await refreshAdvisers();
      setNotification({
        type: 'success',
        message: 'Adviser deleted successfully'
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      setNotification({
        type: 'error',
        message: 'Failed to delete adviser. Please try again.'
      });
    }
  };

  const validateAddForm = (formData: AddFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
    return null;
  };

  const handleAddSubmit = async () => {
    const error = validateAddForm(addFormData);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    setNetworkError(null);
    
    try {
      // Create user in Clerk via server API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/clerk/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: addFormData.email,
          firstName: addFormData.first_name,
          lastName: addFormData.last_name,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 0) {
          throw new Error("Network error - please check your internet connection");
        }
        throw new Error("Failed to create user in Clerk");
      }

      const { clerkId } = await response.json();

      // Then create user in Convex with the Clerk ID
      await createUser({
        clerk_id: clerkId,
        first_name: addFormData.first_name,
        middle_name: addFormData.middle_name || undefined,
        last_name: addFormData.last_name,
        email: addFormData.email,
        role: 1, // 1 = adviser
        adminId: adminId as Id<"users">,
      });

      setIsAddingUser(false);
      setAddFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
      });
      await refreshAdvisers();
      setNotification({
        type: 'success',
        message: 'Adviser added successfully'
      });
    } catch (error) {
      console.error("Error adding user:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes('Network error')) {
          setNetworkError("Network error - please check your internet connection");
        } else {
          setValidationError("Failed to add adviser. Please try again.");
        }
      } else {
        setValidationError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    if (isSubmitting) {
      setShowCancelConfirm(true);
    } else {
      setIsAddingUser(false);
      setAddFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
      });
    }
  };

  const handleConfirmCancel = () => {
    setIsAddingUser(false);
    setShowCancelConfirm(false);
    setIsSubmitting(false);
    setAddFormData({
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
    });
  };

  const filteredAndSortedAdvisers = filterAndSortAdvisers(
    advisers,
    searchTerm,
    statusFilter,
    sortField,
    sortDirection
  );

  const { totalEntries, totalPages, startEntry, endEntry, paginatedAdvisers } = getPaginationInfo(
    filteredAndSortedAdvisers,
    currentPage
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10">
        <Navbar adminId={adminId} />
        
        {/* Notification Banner */}
        {notification && (
          <div className={`w-full px-6 py-3 flex items-center justify-between ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <FaCheckCircle /> :
               notification.type === 'error' ? <FaExclamationTriangle /> :
               <FaInfoCircle />}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="px-6 mt-6 font-bold text-3xl">
          Advisers Table
        </div>

        <div className="px-6 mt-4">
          <div className="mb-4 flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FaSearch />
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS])}
            >
              <option value={TABLE_CONSTANTS.STATUS_FILTERS.ALL}>All Status</option>
              <option value={TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED}>Verified</option>
              <option value={TABLE_CONSTANTS.STATUS_FILTERS.PENDING}>Pending</option>
            </select>
            <button 
              onClick={() => setIsAddingUser(true)}
              className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2"
            >
              <FaPlus /> Add
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-[#B54A4A]">
                  <th 
                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("first_name", sortField, sortDirection, setSortField, setSortDirection)}
                  >
                    <div className="flex items-center justify-center">
                      First Name
                      <span className="ml-1">{getSortIcon("first_name", sortField, sortDirection)}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Middle Name</th>
                  <th 
                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("last_name", sortField, sortDirection, setSortField, setSortDirection)}
                  >
                    <div className="flex items-center justify-center">
                      Last Name
                      <span className="ml-1">{getSortIcon("last_name", sortField, sortDirection)}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("email", sortField, sortDirection, setSortField, setSortDirection)}
                  >
                    <div className="flex items-center justify-center">
                      Email
                      <span className="ml-1">{getSortIcon("email", sortField, sortDirection)}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th 
                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("_creationTime", sortField, sortDirection, setSortField, setSortDirection)}
                  >
                    <div className="flex items-center justify-center">
                      Creation Time
                      <span className="ml-1">{getSortIcon("_creationTime", sortField, sortDirection)}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdvisers.map((adviser: Adviser, index: number) => (
                  <tr key={adviser._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {adviser.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {adviser.middle_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {adviser.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {adviser.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {adviser.email_verified ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {new Date(adviser._creationTime).toISOString().split('T')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(adviser)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full relative group"
                          title="Edit"
                        >
                          <FaEdit />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </span>
                        </button>
                        <button 
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full relative group"
                          title="Reset Password"
                          onClick={() => alert("Password reset functionality is not available yet.")}
                        >
                          <FaKey />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Reset Password
                          </span>
                        </button>
                        <button 
                          onClick={() => setDeleteUser(adviser)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full relative group"
                          title="Delete"
                        >
                          <FaTrash />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startEntry}</span> to <span className="font-medium">{endEntry}</span> of{' '}
                  <span className="font-medium">{totalEntries}</span> entries
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaEdit />
                Edit Adviser
              </h2>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setEditFormData({
                    first_name: "",
                    middle_name: "",
                    last_name: "",
                    email: "",
                  });
                }} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={editFormData.middle_name}
                  onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                  placeholder="Enter middle name (optional)"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                />
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({
                      first_name: "",
                      middle_name: "",
                      last_name: "",
                      email: "",
                    });
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors border-2 border-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Delete</h2>
            <p className="mb-8 text-gray-600">
              Are you sure you want to delete {deleteUser.first_name} {deleteUser.last_name}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors border-2 border-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      {validationError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle />
              <h2 className="text-2xl font-bold text-gray-800">Input Required Fields</h2>
            </div>
            <p className="mb-8 text-gray-600">
              {validationError}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setValidationError(null)}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors border-2 border-blue-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaPlus />
                Add New Adviser
              </h2>
              <button 
                onClick={handleCancelAdd}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                <FaTimes size={24} />
              </button>
            </div>
            {networkError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <div className="text-red-700">
                    <FaExclamationTriangle />
                  </div>
                  <span>{networkError}</span>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addFormData.first_name}
                  onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={addFormData.middle_name}
                  onChange={(e) => setAddFormData({ ...addFormData, middle_name: e.target.value })}
                  placeholder="Enter middle name (optional)"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addFormData.last_name}
                  onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div id="clerk-captcha" className="w-full" />
              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={handleCancelAdd}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubmit}
                  disabled={isSubmitting}
                  className={`px-6 py-2 text-white rounded-lg transition-colors border-2 flex items-center gap-2 ${
                    isSubmitting 
                      ? 'bg-blue-400 border-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 border-blue-500 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add Adviser'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-yellow-500">
                <FaExclamationTriangle />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cancel Adding Adviser?</h2>
            </div>
            <p className="mb-8 text-gray-600">
              The adviser is currently being added. Are you sure you want to cancel? This may leave the process in an incomplete state.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
              >
                Continue Adding
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors border-2 border-red-500"
              >
                Cancel Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
