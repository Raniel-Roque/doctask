"use client";

import { Navbar } from "../../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { useState, useEffect, use, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { UserTable } from "../components/UserTable";
import { AddForm } from "../components/AddForm";
import EditForm from "../components/EditForm";
import { DeleteConfirmation } from "../components/DeleteConfirmation";
import { ValidationError } from "../components/ValidationError";
import { NotificationBanner } from "../../../../components/NotificationBanner";
import {
  User,
  EditFormData,
  AddFormData,
  TABLE_CONSTANTS,
  SortField,
  SortDirection,
  Notification as NotificationType,
} from "../components/types";
import { ResetPasswordConfirmation } from "../components/ResetPasswordConfirmation";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import { sanitizeInput } from "../../../../components/SanitizeInput";
import { LockAccountConfirmation } from "../components/LockAccountConfirmation";
import { apiRequest } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof TABLE_CONSTANTS.STATUS_FILTERS)[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]
  >(TABLE_CONSTANTS.STATUS_FILTERS.ALL);
  const [sortField, setSortField] = useState<SortField>(
    TABLE_CONSTANTS.DEFAULT_SORT_FIELD,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    TABLE_CONSTANTS.DEFAULT_SORT_DIRECTION,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    // Get saved page size from localStorage or default to 5
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("advisersPageSize");
      return saved ? parseInt(saved, 10) : 5;
    }
    return 5;
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Removed individual network error states - using notification banner instead
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
  const [pendingCloseAction, setPendingCloseAction] = useState<
    (() => void) | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Removed networkError state - using notification banner instead

  // =========================================
  // Mutations
  // =========================================
  // No direct Convex mutations for create/update/delete user. Use API routes only.
  const resetPassword = useMutation(api.mutations.resetPassword);
  const logLockAccount = useMutation(api.mutations.logLockAccountMutation);

  // =========================================
  // Queries
  // =========================================
  const instructor = useQuery(api.fetch.getUserById, {
    id: instructorId as Id<"users">,
  });

  const queryData = useQuery(api.fetch.searchUsers, {
    searchTerm,
    role: 1, // 1 for advisers
    emailVerified:
      statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED
        ? true
        : statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.UNVERIFIED
          ? false
          : undefined,
    subrole: undefined, // We don't use subrole for advisers
    pageSize,
    pageNumber: currentPage,
    sortField,
    sortDirection,
  });

  const searchResult = useMemo(
    () =>
      queryData || {
        users: [],
        totalCount: 0,
        totalPages: 0,
        status: "idle",
        hasResults: false,
      },
    [queryData],
  );

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
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  // =========================================
  // Event Handlers
  // =========================================
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prevDirection) =>
        prevDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset pagination when sort changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Reset to 5 entries when changing pages
    setPageSize(5);
    localStorage.setItem("advisersPageSize", "5");
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    localStorage.setItem("advisersPageSize", size.toString());
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

  const logUserAction = () => {
    // No-op in production
  };

  // =========================================
  // Form Submissions
  // =========================================
  const handleEditSubmit = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      // Use apiRequest for robust error handling
      await apiRequest("/api/clerk/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: editingUser.clerk_id,
          email: editFormData.email.trim(),
          firstName: editFormData.first_name.trim(),
          middleName: editFormData.middle_name?.trim() || "",
          lastName: editFormData.last_name.trim(),
          subrole: editFormData.subrole,
        }),
      });
      setNotification({
        type: "success",
        message: "User updated successfully",
      });
      setEditingUser(null);
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update user",
      });
      // Do NOT close the modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUser || !deleteUser.clerk_id) {
      setNotification({
        type: "error",
        message: "Cannot delete user: Missing Clerk ID",
      });
      return;
    }

    setIsDeleting(true);

    try {
      logUserAction();

      // Call distributed-safe API route for deletion
      const response = await fetch("/api/clerk/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: deleteUser.clerk_id,
          instructorClerkId: instructor?.clerk_id, // Pass instructor Clerk ID for Convex lookup
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user from Clerk");
      }

      logUserAction();

      setDeleteUser(null);
      setSuccessMessage("Adviser deleted successfully");
    } catch (error) {
      logUserAction();
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message || "Failed to delete adviser. Please try again."
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const validateAddForm = (formData: AddFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Invalid email format";
    return null;
  };

  const handleAddSubmit = async () => {
    const error = validateAddForm(addFormData);
    if (error) {
      setValidationError(error);
      return;
    }

    // Check if there are any values entered
    const hasValues = Object.values(addFormData).some(
      (value) => value !== "" && value !== 0,
    );
    if (!hasValues) {
      setIsAddingUser(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Call distributed-safe API route for creation
      const response = await fetch("/api/clerk/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: sanitizeInput(addFormData.email, {
            maxLength: 100,
            trim: true,
            removeHtml: true,
          }),
          firstName: sanitizeInput(addFormData.first_name, {
            maxLength: 50,
            trim: true,
            removeHtml: true,
          }),
          lastName: sanitizeInput(addFormData.last_name, {
            maxLength: 50,
            trim: true,
            removeHtml: true,
          }),
          middleName: addFormData.middle_name
            ? sanitizeInput(addFormData.middle_name, {
                maxLength: 50,
                trim: true,
                removeHtml: true,
              })
            : undefined,
          role: 1, // 1 = adviser
          subrole: addFormData.subrole,
          instructorId: instructorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user in Clerk");
      }

      const data = await response.json();

      // Send welcome email via Resend
      await fetch("/api/resend/welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: sanitizeInput(addFormData.first_name, {
            maxLength: 50,
            trim: true,
            removeHtml: true,
          }),
          lastName: sanitizeInput(addFormData.last_name, {
            maxLength: 50,
            trim: true,
            removeHtml: true,
          }),
          email: sanitizeInput(addFormData.email, {
            maxLength: 100,
            trim: true,
            removeHtml: true,
          }),
          password: data.user.password,
        }),
      });

      setSuccessMessage("Adviser added successfully");
      setIsAddingUser(false);
      setAddFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        subrole: 0,
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message || "Failed to create adviser. Please try again."
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    setIsResettingPassword(true);

    try {
      logUserAction();

      // Step 1: Call Clerk API to reset password
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

      // Step 2: Call Convex mutation to log the action
      await resetPassword({
        userId: resetPasswordUser._id,
        instructorId: instructorId as Id<"users">,
      });

      // Step 3: Send reset password email
      await fetch("/api/resend/reset-password-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      });

      setResetPasswordUser(null);
      setSuccessMessage("Password reset successfully");
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setNotification({
            type: "error",
            message: "Request timed out. Please try again.",
          });
        } else if (error.message.includes("Network error")) {
          setNotification({
            type: "error",
            message: "Network error - please check your internet connection",
          });
        } else {
          setNotification({ type: "error", message: error.message });
        }
      } else {
        setNotification({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleLockAccount = async (user: User) => {
    setSelectedUser(user);
  };

  const handleLockAccountSubmit = async (action: "lock" | "unlock") => {
    if (!selectedUser || !instructor) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clerk/lock-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.clerk_id,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      // Log the action
      await logLockAccount({
        instructorId: instructor._id,
        affectedEntityId: selectedUser._id,
        action,
        affectedUserInfo: {
          first_name: selectedUser.first_name,
          middle_name: selectedUser.middle_name,
          last_name: selectedUser.last_name,
          email: selectedUser.email,
        },
        instructorInfo: {
          first_name: instructor.first_name,
          middle_name: instructor.middle_name,
          last_name: instructor.last_name,
          email: instructor.email,
        },
      });

      setSuccessMessage(`Account ${action}ed successfully`);
      setSelectedUser(null);
    } catch (error) {
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
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
          <p className="text-muted-foreground">
            View, add, update, and manage all registered advisers.
          </p>
        </div>

        {/* User Table */}
        <UserTable
          users={searchResult.users}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          currentPage={currentPage}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={setDeleteUser}
          onAdd={() => setIsAddingUser(true)}
          onResetPassword={setResetPasswordUser}
          onLockAccount={handleLockAccount}
          showCodeColumn={true}
          totalPages={searchResult.totalPages}
          totalCount={searchResult.totalCount}
          isLoading={queryData === undefined}
          hasResults={searchResult.hasResults}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          isStudent={false}
          isDeleting={isDeleting}
        />

        {/* Add Form */}
        <AddForm
          isOpen={isAddingUser}
          isSubmitting={isSubmitting}
          networkError={null} // Removed networkError state
          formData={addFormData}
          onClose={() => {
            if (isSubmitting) {
              // During submission, don't allow closing
              return;
            }

            // Check if there are any unsaved changes
            const hasChanges = Object.values(addFormData).some(
              (value) => value !== "" && value !== 0,
            );
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
          networkError={null} // Removed networkError state
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
          networkError={null} // Removed networkError state
        />

        {/* Reset Password Confirmation */}
        <ResetPasswordConfirmation
          user={resetPasswordUser}
          onCancel={() => setResetPasswordUser(null)}
          onConfirm={handleResetPassword}
          isSubmitting={isResettingPassword}
          networkError={null} // Removed networkError state
        />

        {/* Validation Error */}
        <ValidationError
          error={validationError}
          onClose={() => setValidationError(null)}
        />

        {/* Notification */}
        <NotificationBanner
          message={notification?.message || successMessage}
          type={notification?.type || "success"}
          onClose={() => {
            setNotification(null);
            setSuccessMessage(null);
          }}
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

        <LockAccountConfirmation
          user={selectedUser}
          onCancel={() => {
            setSelectedUser(null);
          }}
          onConfirm={handleLockAccountSubmit}
          isSubmitting={isSubmitting}
          networkError={null} // Removed networkError state
        />
      </div>
    </div>
  );
};

export default UsersPage;
