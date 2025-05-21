"use client";

import { Navbar } from "../../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useState, useEffect, use } from "react";
import { useMutation } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdvisersTable } from "./components/AdvisersTable";
import { AddForm } from "./components/AddForm";
import { EditForm } from "./components/EditForm";
import { DeleteConfirmation } from "./components/DeleteConfirmation";
import { ValidationError } from "./components/ValidationError";
import { Notification } from "./components/Notification";
import { Adviser, EditFormData, AddFormData, TABLE_CONSTANTS, SortField, SortDirection } from "./components/types";
import { CancelConfirmation } from "./components/CancelConfirmation";

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UsersPageProps {
  params: Promise<{ adminId: string }>;
}

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

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
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

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 0) {
          throw new Error("Network error - please check your internet connection");
        }
        
        // Use the error message from the server
        setValidationError(responseData.error || "Failed to create user");
        return;
      }

      const { clerkId } = responseData;

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
          setValidationError(error.message || "Failed to add adviser. Please try again.");
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10">
        <Navbar adminId={adminId} />
        
        <Notification 
          notification={notification}
          onClose={() => setNotification(null)}
        />

        <div className="px-6 mt-6 font-bold text-3xl">
          Advisers Table
        </div>

        <AdvisersTable
          advisers={advisers}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          currentPage={currentPage}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSort={handleSort}
          onPageChange={setCurrentPage}
          onEdit={handleEdit}
          onDelete={setDeleteUser}
          onAdd={() => setIsAddingUser(true)}
        />
      </div>

      <EditForm
        user={editingUser}
        formData={editFormData}
        onClose={() => {
          setEditingUser(null);
          setEditFormData({
            first_name: "",
            middle_name: "",
            last_name: "",
            email: "",
          });
        }}
        onSubmit={handleEditSubmit}
        onFormDataChange={setEditFormData}
      />

      <DeleteConfirmation
        user={deleteUser}
        onCancel={() => setDeleteUser(null)}
        onConfirm={handleDeleteSubmit}
      />

      <ValidationError
        error={validationError}
        onClose={() => setValidationError(null)}
        className="z-[60]"
      />

      <AddForm
        isOpen={isAddingUser}
        isSubmitting={isSubmitting}
        networkError={networkError}
        formData={addFormData}
        onClose={handleCancelAdd}
        onSubmit={handleAddSubmit}
        onFormDataChange={setAddFormData}
        className="z-[50]"
      />

      <CancelConfirmation
        isOpen={showCancelConfirm}
        onContinue={() => setShowCancelConfirm(false)}
        onCancel={handleConfirmCancel}
        className="z-[55]"
      />
    </div>
  );
};

export default UsersPage;
