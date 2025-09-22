"use client";

import { Navbar } from "../../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { useState, useEffect, use, useMemo } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { UserTable } from "../components/UserTable";
import { AddForm } from "../components/AddForm";
import EditForm from "../components/EditForm";
import { DeleteConfirmation } from "../components/DeleteConfirmation";
import { ValidationError } from "../components/ValidationError";
import { useBannerManager } from "../../../../components/BannerManager";
import {
  User,
  EditFormData,
  AddFormData,
  TABLE_CONSTANTS,
  SortField,
  SortDirection,
} from "../components/types";
import { ResetPasswordConfirmation } from "../components/ResetPasswordConfirmation";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import { sanitizeInput } from "../../../../components/SanitizeInput";
import { LockAccountConfirmation } from "../components/LockAccountConfirmation";
import { apiRequest } from "@/lib/utils";
import { useMutationWithRetry } from "@/lib/convex-retry";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import * as XLSX from "exceljs";

// =========================================
// Types
// =========================================
interface UsersPageProps {
  params: Promise<{ instructorId: string }>;
}

interface CreateUserResponse {
  user: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  };
}

interface ResetPasswordResponse {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// =========================================
// Component
// =========================================
const UsersPage = ({ params }: UsersPageProps) => {
  // =========================================
  // State
  // =========================================
  const { instructorId } = use(params);
  const { addBanner } = useBannerManager();
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Removed networkError state - using notification banner instead

  // =========================================
  // Enhanced Convex mutations with retry logic
  // =========================================
  const resetPassword = useMutationWithRetry(api.mutations.resetPassword);
  const logLockAccount = useMutationWithRetry(
    api.mutations.logLockAccountMutation,
  );
  const resetAdviserCode = useMutationWithRetry(api.mutations.resetAdviserCode);

  // =========================================
  // Queries
  // =========================================
  const instructor = useQuery(api.fetch.getUserById, {
    id: instructorId as Id<"users">,
  });

  // Fetch all users for frontend filtering and pagination
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
    pageSize: 10000, // Get all users for frontend pagination
    pageNumber: 1,
    sortField,
    sortDirection,
  });

  const searchResult = useMemo(() => {
    // If query is still loading, return loading state
    if (queryData === undefined) {
      return {
        users: [],
        totalCount: 0,
        totalPages: 0,
        status: "loading",
        hasResults: false,
      };
    }

    const data = queryData;

    // Apply frontend pagination
    const totalFilteredCount = data.users.length;
    const totalFilteredPages = Math.ceil(totalFilteredCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = data.users.slice(startIndex, endIndex);

    return {
      ...data,
      users: paginatedUsers,
      totalCount: totalFilteredCount,
      totalPages: totalFilteredPages,
      hasResults: totalFilteredCount > 0,
    };
  }, [queryData, pageSize, currentPage]);

  // =========================================
  // Effects
  // =========================================

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: editingUser.clerk_id,
          email: editFormData.email.trim(),
          firstName: toSentenceCase(editFormData.first_name.trim()),
          middleName: editFormData.middle_name?.trim()
            ? toSentenceCase(editFormData.middle_name.trim())
            : "",
          lastName: toSentenceCase(editFormData.last_name.trim()),
          subrole: editFormData.subrole,
          instructorId: instructorId,
        }),
      });
      addBanner({
        message: "User updated successfully",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
      setEditingUser(null);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.editUser("adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      // Do NOT close the modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUser || !deleteUser.clerk_id) {
      addBanner({
        message: "Cannot delete user: Missing Clerk ID",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    setIsDeleting(true);

    try {
      logUserAction();

      // Call distributed-safe API route for deletion with enhanced retry logic
      await apiRequest("/api/clerk/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: deleteUser.clerk_id,
          instructorId: instructorId,
        }),
      });

      logUserAction();

      setDeleteUser(null);
      addBanner({
        message: "Adviser deleted successfully",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      logUserAction();
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.deleteUser("adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const validateAddForm = (formData: AddFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (formData.email.length > 100)
      return "Email must be less than 100 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Invalid email format";
    return null;
  };

  // Utility function to convert text to sentence case
  const toSentenceCase = (text: string): string => {
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
      // Call distributed-safe API route for creation with enhanced retry logic
      const data = await apiRequest<CreateUserResponse>(
        "/api/clerk/create-user",
        {
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
            firstName: toSentenceCase(
              sanitizeInput(addFormData.first_name, {
                maxLength: 50,
                trim: true,
                removeHtml: true,
              }),
            ),
            lastName: toSentenceCase(
              sanitizeInput(addFormData.last_name, {
                maxLength: 50,
                trim: true,
                removeHtml: true,
              }),
            ),
            middleName: addFormData.middle_name
              ? toSentenceCase(
                  sanitizeInput(addFormData.middle_name, {
                    maxLength: 50,
                    trim: true,
                    removeHtml: true,
                  }),
                )
              : undefined,
            role: 1, // 1 = adviser
            subrole: addFormData.subrole,
            instructorId: instructorId,
          }),
        },
      );

      // Send welcome email via Resend with retry logic
      await apiRequest("/api/resend/welcome-email", {
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

      addBanner({
        message: "Adviser added successfully",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
      setIsAddingUser(false);
      setAddFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        subrole: 0,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.addUser("adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
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

      // Step 1: Call Clerk API to reset password with enhanced retry logic
      const data = await apiRequest<ResetPasswordResponse>(
        "/api/clerk/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkId: resetPasswordUser.clerk_id,
            instructorId: instructorId,
          }),
        },
      );

      // Step 2: Call Convex mutation to log the action with retry logic
      await resetPassword.mutate({
        userId: resetPasswordUser._id,
        instructorId: instructorId as Id<"users">,
      });

      // Step 3: Send reset password email with retry logic
      await apiRequest("/api/resend/reset-password-email", {
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
      addBanner({
        message: "Password reset successfully",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.resetPassword(),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
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
      // Call lock account API with enhanced retry logic
      await apiRequest("/api/clerk/lock-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.clerk_id,
          action,
          instructorId: instructorId,
        }),
      });

      // Log the action
      await logLockAccount.mutate({
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

      addBanner({
        message: `Account ${action}ed successfully`,
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
      setSelectedUser(null);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.lockAccount(action),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCode = async (user: User) => {
    if (!instructor) return;

    // Check if offline before attempting the operation
    if (!navigator.onLine) {
      addBanner({
        message:
          "You are offline. Please check your internet connection and try again.",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetAdviserCode.mutate({
        adviserId: user._id,
        instructorId: instructor._id,
      });

      // Check if result is null/undefined (connection failure)
      if (!result) {
        throw new Error("Failed to fetch - no response received");
      }

      if (result.success) {
        addBanner({
          message: result.message || "Adviser code successfully reset",
          type: "success",
          onClose: () => {},
          autoClose: true,
        });
      } else {
        throw new Error("Failed to fetch - operation was not successful");
      }
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.resetCode("adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================
  // Excel Upload Functions
  // =========================================
  const parseExcelFile = async (file: File): Promise<AddFormData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("Failed to read file"));
            return;
          }

          const workbook = new XLSX.Workbook();
          await workbook.xlsx.load(data as ArrayBuffer);

          const worksheet = workbook.getWorksheet(1); // Get first worksheet
          if (!worksheet) {
            reject(new Error("No worksheet found in the Excel file"));
            return;
          }

          const rows: AddFormData[] = [];
          let headerRow: string[] = [];
          let isFirstRow = true;

          worksheet.eachRow((row) => {
            const rowData = row.values as (string | number | undefined)[];

            if (isFirstRow) {
              // Skip the first element (undefined) and get header row
              headerRow = rowData
                .slice(1)
                .map(
                  (cell: string | number | undefined) =>
                    cell?.toString().toLowerCase().trim() || "",
                );
              isFirstRow = false;
              return;
            }

            // Skip empty rows
            if (!rowData || rowData.length <= 1) return;

            // Extract data starting from index 1 (skip undefined first element)
            const rowValues = rowData.slice(1);

            // Create object mapping based on header
            const userData: Record<string, string> = {};
            headerRow.forEach((header, index) => {
              const value = rowValues[index]?.toString().trim() || "";
              if (header.includes("first") && header.includes("name")) {
                userData.first_name = value;
              } else if (header.includes("middle") && header.includes("name")) {
                userData.middle_name = value;
              } else if (header.includes("last") && header.includes("name")) {
                userData.last_name = value;
              } else if (header.includes("email")) {
                userData.email = value;
              }
            });

            // Only add if we have required fields
            if (userData.first_name && userData.last_name && userData.email) {
              rows.push({
                first_name: userData.first_name,
                middle_name: userData.middle_name || "",
                last_name: userData.last_name,
                email: userData.email,
                subrole: 0, // Default subrole for advisers
              });
            }
          });

          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const validateBulkUsers = (
    users: AddFormData[],
  ): { valid: AddFormData[]; errors: string[] } => {
    const validUsers: AddFormData[] = [];
    const errors: string[] = [];
    const emailSet = new Set<string>();

    users.forEach((user, index) => {
      const rowNumber = index + 2; // +2 because we skip header row and arrays are 0-indexed
      const missingFields: string[] = [];

      // Check required fields and collect missing ones
      if (!user.first_name.trim()) {
        missingFields.push("First Name");
      }
      if (!user.last_name.trim()) {
        missingFields.push("Last Name");
      }
      if (!user.email.trim()) {
        missingFields.push("Email");
      }

      // If any required fields are missing, add error and skip this row
      if (missingFields.length > 0) {
        if (missingFields.length === 1) {
          errors.push(`Row ${rowNumber}: Missing ${missingFields[0]} field`);
        } else {
          errors.push(
            `Row ${rowNumber}: Missing ${missingFields.join(", ")} fields`,
          );
        }
        return;
      }

      // Check email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        errors.push(`Row ${rowNumber}: Invalid email format`);
        return;
      }

      // Check email length
      if (user.email.length > 100) {
        errors.push(`Row ${rowNumber}: Email must be less than 100 characters`);
        return;
      }

      // Check for duplicate emails in the file
      if (emailSet.has(user.email.toLowerCase())) {
        errors.push(`Row ${rowNumber}: Duplicate email found in the file`);
        return;
      }

      // Check for duplicate emails in existing users
      const existingUser = searchResult.users.find(
        (existingUser) =>
          existingUser.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (existingUser) {
        errors.push(`Row ${rowNumber}: Email already exists in the system`);
        return;
      }

      emailSet.add(user.email.toLowerCase());
      validUsers.push(user);
    });

    return { valid: validUsers, errors };
  };

  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if user is online
    if (!navigator.onLine) {
      addBanner({
        message:
          "You are currently offline. Please check your internet connection and try again.",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (!validTypes.includes(file.type)) {
      addBanner({
        message: "Please upload a valid Excel file (.xlsx or .xls)",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addBanner({
        message: "File size must be less than 5MB",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Parse Excel file
      const users = await parseExcelFile(file);

      if (users.length === 0) {
        addBanner({
          message:
            "Invalid Excel format. Required: First Name, Last Name, Email. Optional: Middle Name",
          type: "error",
          onClose: () => {},
          autoClose: true,
        });
        return;
      }

      // Validate users
      const { valid: validUsers, errors: validationErrors } =
        validateBulkUsers(users);

      if (validationErrors.length > 0) {
        addBanner({
          message: `Validation errors found:\n${validationErrors.slice(0, 5).join("\n")}${validationErrors.length > 5 ? `\n... and ${validationErrors.length - 5} more errors` : ""}`,
          type: "error",
          onClose: () => {},
          autoClose: true,
        });
        return;
      }

      if (validUsers.length === 0) {
        addBanner({
          message: "No valid users to import after validation",
          type: "error",
          onClose: () => {},
          autoClose: true,
        });
        return;
      }

      // Create users one by one with progress tracking
      let successCount = 0;
      let errorCount = 0;
      const creationErrors: string[] = [];

      for (let i = 0; i < validUsers.length; i++) {
        const user = validUsers[i];
        setUploadProgress(Math.round(((i + 1) / validUsers.length) * 100));

        // Check network connectivity before each user creation
        if (!navigator.onLine) {
          setIsUploading(false);
          setUploadProgress(0);
          addBanner({
            message: `Upload interrupted: You went offline while processing. ${successCount} users were successfully imported before the connection was lost.`,
            type: "error",
            onClose: () => {},
            autoClose: true,
          });
          return;
        }

        try {
          // Call distributed-safe API route for creation with enhanced retry logic
          const data = await apiRequest<CreateUserResponse>(
            "/api/clerk/create-user",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: sanitizeInput(user.email, {
                  maxLength: 100,
                  trim: true,
                  removeHtml: true,
                }),
                firstName: toSentenceCase(
                  sanitizeInput(user.first_name, {
                    maxLength: 50,
                    trim: true,
                    removeHtml: true,
                  }),
                ),
                lastName: toSentenceCase(
                  sanitizeInput(user.last_name, {
                    maxLength: 50,
                    trim: true,
                    removeHtml: true,
                  }),
                ),
                middleName: user.middle_name
                  ? toSentenceCase(
                      sanitizeInput(user.middle_name, {
                        maxLength: 50,
                        trim: true,
                        removeHtml: true,
                      }),
                    )
                  : undefined,
                role: 1, // 1 = adviser
                subrole: user.subrole,
                instructorId: instructorId,
              }),
            },
          );

          // Send welcome email via Resend with retry logic
          try {
            await apiRequest("/api/resend/welcome-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                firstName: sanitizeInput(user.first_name, {
                  maxLength: 50,
                  trim: true,
                  removeHtml: true,
                }),
                lastName: sanitizeInput(user.last_name, {
                  maxLength: 50,
                  trim: true,
                  removeHtml: true,
                }),
                email: sanitizeInput(user.email, {
                  maxLength: 100,
                  trim: true,
                  removeHtml: true,
                }),
                password: data.user.password,
              }),
            });
          } catch (emailError) {
            // Email sending failed, but user was created successfully
            console.warn("Failed to send welcome email:", emailError);
          }

          successCount++;
        } catch (error) {
          errorCount++;
          creationErrors.push(
            `${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        addBanner({
          message: `Successfully imported ${successCount} adviser${successCount > 1 ? "s" : ""}`,
          type: "success",
          onClose: () => {},
          autoClose: true,
        });
      } else if (successCount > 0 && errorCount > 0) {
        addBanner({
          message: `Imported ${successCount} adviser${successCount > 1 ? "s" : ""} successfully. ${errorCount} failed:\n${creationErrors.slice(0, 3).join("\n")}${creationErrors.length > 3 ? `\n... and ${creationErrors.length - 3} more errors` : ""}`,
          type: "warning",
          onClose: () => {},
          autoClose: true,
        });
      } else {
        addBanner({
          message: `Failed to import any advisers:\n${creationErrors.slice(0, 5).join("\n")}${creationErrors.length > 5 ? `\n... and ${creationErrors.length - 5} more errors` : ""}`,
          type: "error",
          onClose: () => {},
          autoClose: true,
        });
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, ErrorContexts.uploadFile());
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = "";
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
          onResetCode={handleResetCode}
          showCodeColumn={true}
          totalPages={searchResult.totalPages}
          totalCount={searchResult.totalCount}
          isLoading={queryData === undefined}
          hasResults={searchResult.hasResults}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          isStudent={false}
          isDeleting={isDeleting}
          onExcelUpload={handleExcelUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isModalOpen={
            isAddingUser ||
            !!editingUser ||
            !!deleteUser ||
            !!resetPasswordUser ||
            isResettingPassword ||
            showUnsavedConfirm
          }
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
