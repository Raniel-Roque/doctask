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
import { ResetPasswordConfirmation } from "../components/ResetPasswordConfirmation";
import { SuccessBanner } from "../components/SuccessBanner";
import { UnsavedChangesConfirmation } from "../components/UnsavedChangesConfirmation";

// =========================================
// Types
// =========================================
interface UsersPageProps {
  params: Promise<{ instructorId: string }>;
}

// =========================================
// Component
// =========================================
const UsersPage = ({ params }: UsersPageProps) => {
  // =========================================
  // State
  // =========================================
  const { instructorId } = use(params);
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
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);

  // =========================================
  // Mutations
  // =========================================
  const updateUser = useMutation(api.mutations.updateUser);
  const createUser = useMutation(api.mutations.createUser);

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
    const data = await client.query(api.fetch.getAdvisers);
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
      instructorId,
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
            email: editFormData.email.trim(),
            firstName: editFormData.first_name.trim(),
            lastName: editFormData.last_name.trim(),
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

        const data = await response.json();
        
        // Update in Convex with all changed fields
        await updateUser({
          userId: editingUser._id,
          instructorId: instructorId as Id<"users">,
          first_name: editFormData.first_name.trim(),
          middle_name: editFormData.middle_name?.trim() || undefined,
          last_name: editFormData.last_name.trim(),
          email: editFormData.email.trim(),
          subrole: editFormData.subrole,
          clerk_id: data.clerkId
        });
      } else {
        // Update in Convex without changing Clerk ID
        await updateUser({
          userId: editingUser._id,
          instructorId: instructorId as Id<"users">,
          first_name: editFormData.first_name.trim(),
          middle_name: editFormData.middle_name?.trim() || undefined,
          last_name: editFormData.last_name.trim(),
          email: editFormData.email.trim(),
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
    if (!deleteUser || !deleteUser.clerk_id) {
      setNotification({
        type: 'error',
        message: 'Cannot delete user: Missing Clerk ID'
      });
      return;
    }

    setIsDeleting(true);
    setDeleteNetworkError(null);

    try {
      logUserAction('Delete Started', { 
        userId: deleteUser._id,
        email: deleteUser.email
      });

      // Delete from Clerk API (which also handles Convex deletion)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const clerkResponse = await fetch("/api/clerk/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: deleteUser.clerk_id,
          instructorId: instructorId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!clerkResponse.ok) {
        if (clerkResponse.status === 0) {
          throw new Error("Network error - please check your internet connection");
        }
        const errorData = await clerkResponse.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

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
          email: addFormData.email.trim(),
          firstName: addFormData.first_name.trim(),
          lastName: addFormData.last_name.trim(),
          role: 1, // Add role for advisers
          instructorId: instructorId,
          middle_name: addFormData.middle_name?.trim() || undefined
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

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to create user");
      }

      // Create user in Convex
      try {
        await createUser({
          clerk_id: data.user.id,
          first_name: addFormData.first_name.trim(),
          middle_name: addFormData.middle_name?.trim() || undefined,
          last_name: addFormData.last_name.trim(),
          email: addFormData.email.trim(),
          role: 1, // 1 = adviser
          instructorId: instructorId as Id<"users">,
        });
      } catch (convexError) {
        // If Convex creation fails, we should clean up the Clerk user
        try {
          await fetch("/api/clerk/delete-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ clerkId: data.user.id }),
          });
        } catch (cleanupError) {
          console.error("Failed to clean up Clerk user:", cleanupError);
        }
        throw convexError;
      }

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
      console.error("Error creating user:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setAddNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes('Network error')) {
          setAddNetworkError("Network error - please check your internet connection");
        } else {
          setNotification({
            type: 'error',
            message: error.message || 'Failed to create adviser. Please try again.'
          });
        }
      } else {
        setNotification({
          type: 'error',
          message: 'An unexpected error occurred. Please try again.'
        });
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
      
      setResetPasswordUser(null);
      await refreshAdvisers();
      setSuccessMessage("Password reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setResetPasswordNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes('Network error')) {
          setResetPasswordNetworkError("Network error - please check your internet connection");
        } else {
          setResetPasswordNetworkError(error.message);
        }
      } else {
        setResetPasswordNetworkError("An unexpected error occurred. Please try again.");
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
        <Navbar instructorId={instructorId} />
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
          showCodeColumn={true}
        />

        {/* Add Form */}
        <AddForm
          isOpen={isAddingUser}
          isSubmitting={isSubmitting}
          networkError={addNetworkError}
          setNetworkError={setAddNetworkError}
          formData={addFormData}
          onClose={() => {
            if (isSubmitting) {
              // During submission, don't allow closing
              return;
            }
            
            // Check if there are any unsaved changes
            const hasChanges = Object.values(addFormData).some(value => value !== "" && value !== 0);
            if (hasChanges) {
              // Just show the confirmation dialog without closing anything
              setPendingCloseAction(() => () => {
                setIsAddingUser(false);
                setAddFormData({
                  first_name: "",
                  middle_name: "",
                  last_name: "",
                  email: "",
                });
              });
              setShowUnsavedConfirm(true);
              return; // Prevent the form from closing
            }
            
            // No changes, safe to close
            setIsAddingUser(false);
            setAddFormData({
              first_name: "",
              middle_name: "",
              last_name: "",
              email: "",
            });
          }}
          onSubmit={handleAddSubmit}
          onFormDataChange={setAddFormData}
          isStudent={false}
        />

        {/* Edit Form */}
        <EditForm
          user={editingUser}
          formData={editFormData}
          isSubmitting={isSubmitting}
          networkError={editNetworkError}
          setNetworkError={setEditNetworkError}
          onClose={() => {
            if (isSubmitting) {
              // During submission, don't allow closing
              return;
            }

            if (!editingUser) return;
            
            // Check if there are any unsaved changes
            const hasChanges = 
              editFormData.first_name !== editingUser.first_name ||
              editFormData.middle_name !== (editingUser.middle_name || "") ||
              editFormData.last_name !== editingUser.last_name ||
              editFormData.email !== editingUser.email;

            if (hasChanges) {
              // Just show the confirmation dialog without closing anything
              setPendingCloseAction(() => () => {
                setEditingUser(null);
                setEditFormData({
                  first_name: "",
                  middle_name: "",
                  last_name: "",
                  email: "",
                });
              });
              setShowUnsavedConfirm(true);
              return; // Prevent the form from closing
            }
            
            // No changes, safe to close
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
          isStudent={false}
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

        {/* Unsaved Changes Confirmation */}
        <UnsavedChangesConfirmation
          isOpen={showUnsavedConfirm}
          onContinue={() => {
            // Just close the confirmation dialog and execute the pending action
            if (pendingCloseAction) {
              pendingCloseAction();
            }
            setShowUnsavedConfirm(false);
            setPendingCloseAction(null);
          }}
          onCancel={() => {
            // Just close the confirmation dialog, keep the form open
            setShowUnsavedConfirm(false);
            setPendingCloseAction(null);
          }}
        />
      </div>
    </div>
  );
};

export default UsersPage;
