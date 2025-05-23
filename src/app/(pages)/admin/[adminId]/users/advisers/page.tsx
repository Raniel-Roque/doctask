"use client";

import { Navbar } from "../../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useState, useEffect, use } from "react";
import { useMutation } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { UserTable } from "../components/UserTable";
import { AddForm } from "../components/AddForm";
import { EditForm } from "../components/EditForm";
import { DeleteConfirmation } from "../components/DeleteConfirmation";
import { ValidationError } from "../components/ValidationError";
import { Notification } from "../components/Notification";
import { User, EditFormData, AddFormData, TABLE_CONSTANTS, SortField, SortDirection, LogDetails, Notification as NotificationType } from "../components/types";
import { CancelConfirmation } from "../components/CancelConfirmation";
import { ResetPasswordConfirmation } from "../components/ResetPasswordConfirmation";
import { SuccessBanner } from "../components/SuccessBanner";

// =========================================
// Types
// =========================================
interface UsersPageProps {
  params: Promise<{ adminId: string }>;
}

// =========================================
// Component
// =========================================
const UsersPage = ({ params }: UsersPageProps) => {
  // =========================================
  // State
  // =========================================
  const { adminId } = use(params);
  const [advisers, setAdvisers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]>(TABLE_CONSTANTS.STATUS_FILTERS.ALL);
  const [sortField, setSortField] = useState<SortField>(TABLE_CONSTANTS.DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<SortDirection>(TABLE_CONSTANTS.DEFAULT_SORT_DIRECTION);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [editNetworkError, setEditNetworkError] = useState<string | null>(null);
  const [deleteNetworkError, setDeleteNetworkError] = useState<string | null>(null);
  const [addNetworkError, setAddNetworkError] = useState<string | null>(null);
  const [resetPasswordNetworkError, setResetPasswordNetworkError] = useState<string | null>(null);
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
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // =========================================
  // Mutations
  // =========================================
  const updateUser = useMutation(api.documents.updateUser);
  const deleteUserMutation = useMutation(api.documents.deleteUser);
  const createUser = useMutation(api.documents.createUser);

  // =========================================
  // Effects
  // =========================================
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

  // =========================================
  // Data Fetching
  // =========================================
  const refreshAdvisers = async () => {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const data = await client.query(api.documents.getAdvisers);
    setAdvisers(data || []);
  };

  useEffect(() => {
    refreshAdvisers();
  }, []);

  // =========================================
  // Event Handlers
  // =========================================
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // =========================================
  // Form Validation
  // =========================================
  const validateEditForm = (formData: EditFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
    return null;
  };

  // =========================================
  // User Actions
  // =========================================
  const handleEdit = (adviser: User) => {
    setEditingUser(adviser);
    setEditFormData({
      first_name: adviser.first_name,
      middle_name: adviser.middle_name || "",
      last_name: adviser.last_name,
      email: adviser.email,
      subrole: adviser.subrole,
    });
  };

  const logUserAction = (action: string, details: LogDetails) => {
    console.log(`[User Action] ${action}:`, {
      adminId,
      ...details
    });
  };

  // =========================================
  // Form Submissions
  // =========================================
  const handleEditSubmit = async () => {
    if (!editingUser) return;

    const error = validateEditForm(editFormData);
    if (error) {
      logUserAction('Edit Validation Failed', { error, user: editingUser });
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    setEditNetworkError(null);

    try {
      logUserAction('Edit Started', { 
        userId: editingUser._id,
        oldEmail: editingUser.email,
        newEmail: editFormData.email,
        changes: {
          firstName: editFormData.first_name !== editingUser.first_name,
          lastName: editFormData.last_name !== editingUser.last_name,
          email: editFormData.email !== editingUser.email,
        }
      });

      // If email is changed, update in Clerk first
      if (editFormData.email !== editingUser.email) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch("/api/clerk/update-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkId: editingUser.clerk_id,
            email: editFormData.email,
            firstName: editFormData.first_name,
            lastName: editFormData.last_name,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 0) {
            throw new Error("Network error - please check your internet connection");
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update user email");
        }

        const { newClerkId } = await response.json();

        // Update in Convex with new Clerk ID
        await updateUser({
          userId: editingUser._id,
          adminId: adminId as Id<"users">,
          clerk_id: newClerkId,
          first_name: editFormData.first_name,
          middle_name: editFormData.middle_name || undefined,
          last_name: editFormData.last_name,
          email: editFormData.email,
          subrole: editFormData.subrole,
        });
      } else {
        // Update in Convex without changing Clerk ID
        await updateUser({
          userId: editingUser._id,
          adminId: adminId as Id<"users">,
          first_name: editFormData.first_name,
          middle_name: editFormData.middle_name || undefined,
          last_name: editFormData.last_name,
          email: editFormData.email,
          subrole: editFormData.subrole,
        });
      }

      logUserAction('Edit Success', { 
        userId: editingUser._id,
        changes: {
          firstName: editFormData.first_name !== editingUser.first_name,
          lastName: editFormData.last_name !== editingUser.last_name,
          email: editFormData.email !== editingUser.email,
        }
      });

      setSuccessMessage("User updated successfully");
      setEditingUser(null);
      refreshAdvisers();
    } catch (error) {
      logUserAction('Edit Failed', { 
        userId: editingUser._id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setEditNetworkError(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUser) return;

    setIsDeleting(true);
    setDeleteNetworkError(null);

    try {
      logUserAction('Delete Started', { 
        userId: deleteUser._id,
        email: deleteUser.email
      });

      // First delete from Clerk with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const clerkResponse = await fetch("/api/clerk/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: deleteUser.clerk_id,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!clerkResponse.ok) {
        if (clerkResponse.status === 0) {
          throw new Error("Network error - please check your internet connection");
        }
        const errorData = await clerkResponse.json();
        throw new Error(errorData.error || "Failed to delete user from Clerk");
      }

      // Then delete from Convex
      await deleteUserMutation({
        userId: deleteUser._id,
        adminId: adminId as Id<"users">,
      });

      logUserAction('Delete Success', { 
        userId: deleteUser._id,
        email: deleteUser.email
      });

      setDeleteUser(null);
      await refreshAdvisers();
      setSuccessMessage("Adviser deleted successfully");
    } catch (error) {
      logUserAction('Delete Failed', { 
        userId: deleteUser._id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error("Error deleting user:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setDeleteNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes('Network error')) {
          setDeleteNetworkError("Network error - please check your internet connection");
        } else {
          setNotification({
            type: 'error',
            message: error.message || 'Failed to delete adviser. Please try again.'
          });
        }
      } else {
        setNotification({
          type: 'error',
          message: 'An unexpected error occurred. Please try again.'
        });
      }
    } finally {
      setIsDeleting(false);
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
    setAddNetworkError(null);

    try {
      // Create user in Clerk first
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user in Clerk");
      }

      const { clerkId } = await response.json();

      // Create user in Convex
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
      setSuccessMessage("Adviser added successfully");
    } catch (error) {
      console.error("Error adding user:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setAddNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes('Network error')) {
          setAddNetworkError("Network error - please check your internet connection");
        } else {
          setValidationError(error.message);
        }
      } else {
        setValidationError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    setIsResettingPassword(true);
    setResetPasswordNetworkError(null);

    try {
      logUserAction("reset_password_started", { 
        userId: resetPasswordUser._id,
        email: resetPasswordUser.email
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/clerk/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: resetPasswordUser.clerk_id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      
      // Update user in Convex with new Clerk ID
      await updateUser({
        userId: resetPasswordUser._id,
        first_name: resetPasswordUser.first_name,
        middle_name: resetPasswordUser.middle_name,
        last_name: resetPasswordUser.last_name,
        email: resetPasswordUser.email,
        adminId: adminId as Id<"users">,
        clerk_id: data.newClerkId,
        isPasswordReset: true,
      });

      // Reset password user state and close dialog
      setResetPasswordUser(null);
      setIsResettingPassword(false);
      
      // Refresh advisers list
      await refreshAdvisers();
      
      logUserAction("reset_password_success", { 
        userId: resetPasswordUser._id,
        email: resetPasswordUser.email
      });

      setSuccessMessage("Password reset email sent successfully");
    } catch (error) {
      logUserAction("reset_password_failed", { 
        userId: resetPasswordUser._id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setResetPasswordNetworkError("Request timed out. Please try again.");
        } else {
          setNotification({
            type: "error",
            message: error.message,
          });
        }
      } else {
        setNotification({
          type: "error",
          message: "An unexpected error occurred",
        });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div className="min-h-screen bg-gray-50">
        <Navbar adminId={adminId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Advisers Table</h1>
            <p className="text-muted-foreground">View, add, update, and manage all registered advisers.</p>
        </div>
        
        {/* User Table */}
        <UserTable
          users={advisers}
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
          onResetPassword={setResetPasswordUser}
        />

        {/* Add Form */}
        <AddForm
          isOpen={isAddingUser}
          isSubmitting={isSubmitting}
          networkError={addNetworkError}
          formData={addFormData}
          onClose={() => {
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
          }}
          onSubmit={handleAddSubmit}
          onFormDataChange={setAddFormData}
        />

        {/* Edit Form */}
      <EditForm
        user={editingUser}
        formData={editFormData}
        isSubmitting={isSubmitting}
        networkError={editNetworkError}
        onClose={() => {
            if (isSubmitting) {
              setShowCancelConfirm(true);
            } else {
          setEditingUser(null);
          setEditFormData({
            first_name: "",
            middle_name: "",
            last_name: "",
            email: "",
          });
            }
        }}
        onSubmit={handleEditSubmit}
        onFormDataChange={setEditFormData}
      />

        {/* Delete Confirmation */}
      <DeleteConfirmation
        user={deleteUser}
          onCancel={() => setDeleteUser(null)}
        onConfirm={handleDeleteSubmit}
        isSubmitting={isDeleting}
        networkError={deleteNetworkError}
      />

        {/* Reset Password Confirmation */}
        <ResetPasswordConfirmation
          user={resetPasswordUser}
          onCancel={() => setResetPasswordUser(null)}
          onConfirm={handleResetPassword}
          isSubmitting={isResettingPassword}
          networkError={resetPasswordNetworkError}
        />

        {/* Validation Error */}
      <ValidationError
        error={validationError}
        onClose={() => setValidationError(null)}
        />

        {/* Notification */}
        <Notification
          notification={notification}
          onClose={() => setNotification(null)}
        />

        {/* Success Banner */}
        <SuccessBanner
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
      />

        {/* Cancel Confirmation */}
      <CancelConfirmation
        isOpen={showCancelConfirm}
        onContinue={() => setShowCancelConfirm(false)}
        onCancel={() => {
            setShowCancelConfirm(false);
            setIsAddingUser(false);
            setEditingUser(null);
            setAddFormData({
              first_name: "",
              middle_name: "",
              last_name: "",
              email: "",
            });
            setEditFormData({
              first_name: "",
              middle_name: "",
              last_name: "",
              email: "",
            });
            setIsSubmitting(false);
          }}
      />
      </div>
    </div>
  );
};

export default UsersPage;
