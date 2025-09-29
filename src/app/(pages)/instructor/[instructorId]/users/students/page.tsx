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
import { ResetPasswordConfirmation } from "../components/ResetPasswordConfirmation";
import {
  User,
  EditFormData,
  AddFormData,
  TABLE_CONSTANTS,
  SortField,
  SortDirection,
} from "../components/types";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { apiRequest } from "@/lib/utils";
import { useMutationWithRetry } from "@/lib/convex-retry";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { LockAccountConfirmation } from "../components/LockAccountConfirmation";
import { validateUserForm } from "../../utils/validation";
import * as XLSX from "exceljs";

// =========================================
// Types
// =========================================
interface UsersStudentsPageProps {
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
const UsersStudentsPage = ({ params }: UsersStudentsPageProps) => {
  // =========================================
  // State
  // =========================================
  const { instructorId } = use(params);
  const { addBanner } = useBannerManager();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof TABLE_CONSTANTS.STATUS_FILTERS)[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]
  >(TABLE_CONSTANTS.STATUS_FILTERS.ALL);
  const [roleFilter, setRoleFilter] = useState<
    (typeof TABLE_CONSTANTS.ROLE_FILTERS)[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS]
  >(TABLE_CONSTANTS.ROLE_FILTERS.ALL);
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
      const saved = localStorage.getItem("studentsPageSize");
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
    subrole: 0,
  });
  const [addFormData, setAddFormData] = useState<AddFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    subrole: 0,
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
  // Mutations
  // =========================================
  // Enhanced Convex mutations with retry logic
  const resetPassword = useMutationWithRetry(api.mutations.resetPassword);
  const logLockAccount = useMutationWithRetry(
    api.mutations.logLockAccountMutation,
  );

  // =========================================
  // Queries
  // =========================================
  const instructor = useQuery(api.fetch.getUserById, {
    id: instructorId as Id<"users">,
  });

  // Fetch all users for frontend filtering and pagination
  const queryData = useQuery(api.fetch.searchUsers, {
    searchTerm,
    role: 0, // 0 for students
    emailVerified:
      statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED
        ? true
        : statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.UNVERIFIED
          ? false
          : undefined,
    subrole:
      roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MANAGER
        ? 1
        : roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MEMBER
          ? 0
          : undefined,
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

  // Update filter handlers to reset pagination
  const handleStatusFilterChange = (
    value: (typeof TABLE_CONSTANTS.STATUS_FILTERS)[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS],
  ) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (
    value: (typeof TABLE_CONSTANTS.ROLE_FILTERS)[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS],
  ) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  // Update search handler to reset pagination
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    localStorage.setItem("studentsPageSize", size.toString());
  };

  // =========================================
  // Form Validation
  // =========================================
  const validateAddForm = (formData: AddFormData): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (formData.email.length > 100)
      return "Email must be less than 100 characters";
    if (!/^.*@.*\..*$/.test(formData.email)) return "Invalid email format";
    return null;
  };

  // =========================================
  // User Actions
  // =========================================
  const handleEdit = (student: User) => {
    setEditingUser(student);
    setEditFormData({
      first_name: student.first_name,
      middle_name: student.middle_name ?? "",
      last_name: student.last_name,
      email: student.email,
      subrole: student.subrole ?? 0,
    });
  };

  const logUserAction = () => {
    // No-op in production
  };

  const handleLockAccount = (user: User) => {
    setSelectedUser(user);
  };

  const handleLockAccountSubmit = async (action: "lock" | "unlock") => {
    if (!selectedUser || !selectedUser.clerk_id) {
      addBanner({
        message: "Cannot lock account: Missing Clerk ID",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      logUserAction();

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
      if (instructor) {
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
      }

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

  // =========================================
  // Form Submissions
  // =========================================
  const handleEditSubmit = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      // Use enhanced apiRequest with retry logic for robust error handling
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
          newProjectManagerId: editFormData.newProjectManagerId,
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
        ErrorContexts.editUser("student"),
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
        message: "Student deleted successfully",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        ErrorContexts.deleteUser("student"),
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
            role: 0, // 0 = student
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
        message: "Student added successfully",
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
        ErrorContexts.addUser("student"),
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
      addBanner({
        message: "Password reset and email sent successfully.",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
      setResetPasswordUser(null);
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

  const handleCloseAddForm = () => {
    if (isSubmitting) {
      setShowUnsavedConfirm(true);
      setPendingCloseAction(() => () => {
        setIsAddingUser(false);
      });
    } else {
      setIsAddingUser(false);
    }
  };

  // =========================================
  // Excel Upload Functions for Students
  // =========================================
  const parseExcelFile = async (
    file: File,
  ): Promise<{ users: AddFormData[]; dataStartOffset: number }> => {
    return new Promise<{ users: AddFormData[]; dataStartOffset: number }>(
      (resolve, reject) => {
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
            let headerRowFound = false;
            let dataStartOffset = 1; // Track how many rows to skip before data starts

            worksheet.eachRow((row) => {
              const rowData = row.values as (string | number | undefined)[];

              if (isFirstRow) {
                // Check if first row contains headers (look for common header keywords)
                const firstRowText = rowData
                  .slice(1)
                  .map((cell) => cell?.toString().toLowerCase().trim() || "")
                  .join(" ");

                const hasHeaderKeywords =
                  (firstRowText.includes("first") && firstRowText.includes("name")) ||
                  (firstRowText.includes("middle") && firstRowText.includes("name")) ||
                  (firstRowText.includes("last") && firstRowText.includes("name")) ||
                  firstRowText.includes("email") ||
                  firstRowText.includes("role");

                if (hasHeaderKeywords) {
                  // First row is headers (no title row)
                  headerRow = rowData
                    .slice(1)
                    .map(
                      (cell: string | number | undefined) =>
                        cell?.toString().toLowerCase().trim() || "",
                    );
                  headerRowFound = true;
                  dataStartOffset = 1; // Data starts at row 2
                  isFirstRow = false;
                  return;
                } else {
                  // First row is title, skip it
                  dataStartOffset = 2; // Data starts at row 3
                  isFirstRow = false;
                  return;
                }
              }

              if (!headerRowFound) {
                // Use second row as headers (after title row)
                headerRow = rowData
                  .slice(1)
                  .map(
                    (cell: string | number | undefined) =>
                      cell?.toString().toLowerCase().trim() || "",
                  );
                headerRowFound = true;
                return;
              }

              // Skip empty rows
              if (!rowData || rowData.length <= 1) return;

              // Create object mapping based on header
              const userData: Record<string, string> = {};
              headerRow.forEach((header, index) => {
                // Get the cell and extract its text content (works for both regular text and hyperlinks)
                const cell = row.getCell(index + 1);
                const value = cell.text?.toString().trim() || "";

                if ((header.includes("first") && header.includes("name")) || header.includes("firstname")) {
                  userData.first_name = value;
                } else if (
                  (header.includes("middle") && header.includes("name")) ||
                  header.includes("middlename")
                ) {
                  userData.middle_name = value;
                } else if (header.includes("last") && header.includes("name") || header.includes("lastname")) {
                  userData.last_name = value;
                } else if (header.includes("email")) {
                  userData.email = value;
                } else if (header.includes("role")) {
                  userData.role = value;
                }
              });

              // Only add if we have required fields
              if (userData.first_name && userData.last_name && userData.email) {
                // Parse role to subrole with validation
                let subrole = 0; // Default to Project Member
                let roleError = null;

                if (userData.role) {
                  const roleLower = userData.role.toLowerCase().trim();

                  // Check for numeric values first
                  if (roleLower === "1" || roleLower === "0") {
                    subrole = parseInt(roleLower);
                  } else if (
                    roleLower.includes("manager") ||
                    roleLower.includes("project manager")
                  ) {
                    subrole = 1; // Project Manager
                  } else if (
                    roleLower.includes("member") ||
                    roleLower.includes("project member")
                  ) {
                    subrole = 0; // Project Member
                  } else {
                    // Invalid role value
                    roleError = `Invalid role "${userData.role}".`;
                  }
                }

                // Add role error to the row data for validation
                const rowData = {
                  first_name: userData.first_name,
                  middle_name: userData.middle_name || "",
                  last_name: userData.last_name,
                  email: userData.email,
                  subrole: subrole,
                  roleError: roleError,
                };

                rows.push(rowData);
              }
            });

            resolve({ users: rows, dataStartOffset });
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };

        reader.readAsArrayBuffer(file);
      },
    );
  };

  const validateBulkUsers = (
    users: AddFormData[],
    dataStartOffset: number = 2,
  ): { valid: AddFormData[]; errors: string[] } => {
    const validUsers: AddFormData[] = [];
    const errors: string[] = [];
    const emailSet = new Set<string>();

    users.forEach((user, index) => {
      const rowNumber = index + dataStartOffset + 1; // Dynamic: +dataStartOffset + 1 for 1-based row numbering

      // Check for role errors first
      if (
        "roleError" in user &&
        (user as AddFormData & { roleError?: string }).roleError
      ) {
        errors.push(
          `Row ${rowNumber}: ${(user as AddFormData & { roleError?: string }).roleError}`,
        );
        return;
      }

      // Use the same validation logic as AddForm and EditForm
      const validationErrors = validateUserForm(user);

      if (validationErrors) {
        // Convert validation errors to row-specific error messages
        Object.entries(validationErrors).forEach(([, message]) => {
          errors.push(`Row ${rowNumber}: ${message}`);
        });
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
      const parseResult = await parseExcelFile(file);
      const users = parseResult.users;
      const dataStartOffset = parseResult.dataStartOffset;

      if (users.length === 0) {
        addBanner({
          message: "The Excel sheet is empty. Please add user data",
          type: "error",
          onClose: () => {},
          autoClose: true,
        });
        return;
      }

      // Validate users
      const { valid: validUsers, errors: validationErrors } = validateBulkUsers(
        users,
        dataStartOffset,
      );

      if (validationErrors.length > 0) {
        const errorMessage =
          validationErrors.length === 1
            ? `Validation error found:\n${validationErrors[0]}`
            : `Multiple rows have validation issues (${validationErrors.length} errors found). Please check your Excel file format and data.`;
        addBanner({
          message: errorMessage,
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
                role: 0, // 0 = student
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
          message: `Successfully imported ${successCount} student${successCount > 1 ? "s" : ""}`,
          type: "success",
          onClose: () => {},
          autoClose: true,
        });
      } else if (successCount > 0 && errorCount > 0) {
        const errorMessage =
          errorCount === 1
            ? `Imported ${successCount} student${successCount > 1 ? "s" : ""} successfully. 1 failed:\n${creationErrors[0]}`
            : `Imported ${successCount} student${successCount > 1 ? "s" : ""} successfully. Multiple rows failed to import (${errorCount} errors).`;
        addBanner({
          message: errorMessage,
          type: "warning",
          onClose: () => {},
          autoClose: true,
        });
      } else {
        const errorMessage =
          errorCount === 1
            ? `Failed to import any students:\n${creationErrors[0]}`
            : `Failed to import any students. Multiple rows have issues (${errorCount} errors found).`;
        addBanner({
          message: errorMessage,
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
          <h1 className="text-3xl font-bold">Students Table</h1>
          <p className="text-muted-foreground">
            View, add, update, and manage all registered students.
          </p>
        </div>

        {/* User Table */}
        <UserTable
          users={searchResult.users}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          roleFilter={roleFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          currentPage={currentPage}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onRoleFilterChange={handleRoleFilterChange}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={setDeleteUser}
          onAdd={() => setIsAddingUser(true)}
          onResetPassword={setResetPasswordUser}
          onLockAccount={handleLockAccount}
          showRoleColumn={true}
          totalPages={searchResult.totalPages}
          totalCount={searchResult.totalCount}
          isLoading={queryData === undefined}
          hasResults={searchResult.hasResults}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          isStudent={true}
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
          networkError={null} // Removed networkError prop
          formData={addFormData}
          onClose={handleCloseAddForm}
          onSubmit={handleAddSubmit}
          onFormDataChange={setAddFormData}
          isStudent={true}
        />

        {/* Edit Form */}
        <EditForm
          user={editingUser}
          formData={editFormData}
          isSubmitting={isSubmitting}
          networkError={null} // Removed networkError prop
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
              editFormData.email !== editingUser.email ||
              editFormData.subrole !== editingUser.subrole;

            if (hasChanges) {
              // Just show the confirmation dialog without closing anything
              setPendingCloseAction(() => () => {
                setEditingUser(null);
                setEditFormData({
                  first_name: "",
                  middle_name: "",
                  last_name: "",
                  email: "",
                  subrole: 0,
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
              subrole: 0,
            });
          }}
          onSubmit={handleEditSubmit}
          onFormDataChange={setEditFormData}
          isStudent={true}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmation
          user={deleteUser}
          onCancel={() => setDeleteUser(null)}
          onConfirm={handleDeleteSubmit}
          isSubmitting={isDeleting}
          networkError={null} // Removed networkError prop
        />

        {/* Reset Password Confirmation */}
        <ResetPasswordConfirmation
          user={resetPasswordUser}
          onCancel={() => setResetPasswordUser(null)}
          onConfirm={handleResetPassword}
          isSubmitting={isResettingPassword}
          networkError={null} // Removed networkError prop
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
            if (pendingCloseAction) {
              pendingCloseAction();
            }
            setShowUnsavedConfirm(false);
            setPendingCloseAction(null);
          }}
          onCancel={() => {
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
          networkError={null} // Removed networkError prop
        />
      </div>
    </div>
  );
};

export default UsersStudentsPage;
