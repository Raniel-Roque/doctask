"use client";

import { Navbar } from "../components/navbar";
import { use, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import "cropperjs/dist/cropper.css";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { PrimaryProfile } from "@/app/(pages)/components/PrimaryProfile";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { FaExclamationTriangle, FaTrash, FaDatabase } from "react-icons/fa";
import PasswordVerification from "@/app/(pages)/components/PasswordVerification";
import { apiRequest } from "@/lib/utils";
import {
  generateEncryptionKey,
  exportKey,
  encryptData,
  importKey,
  decryptData,
} from "@/utils/encryption";
import JSZip from "jszip";

interface InstructorProfilePageProps {
  params: Promise<{ instructorId: string }>;
}

const InstructorProfilePage = ({ params }: InstructorProfilePageProps) => {
  const { instructorId } = use(params);
  const { user } = useUser();
  const { addBanner } = useBannerManager();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  // Backup-related state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showBackupPasswordVerify, setShowBackupPasswordVerify] =
    useState(false);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [pendingBackupAction, setPendingBackupAction] = useState<
    "download" | "restore" | null
  >(null);

  // Fetch user data from Convex
  const userData = useQuery(api.fetch.getUserById, {
    id: instructorId as Id<"users">,
  });

  // Handle success messages
  useEffect(() => {
    if (successMessage) {
      addBanner({
        message: successMessage,
        type: "success",
        onClose: () => setSuccessMessage(null),
        autoClose: true,
      });
    }
  }, [successMessage, addBanner]);

  // Handle uploading notifications
  useEffect(() => {
    if (isUploading) {
      addBanner({
        message: "Uploading profile picture...",
        type: "info",
        onClose: () => {},
        autoClose: false,
      });
    }
  }, [isUploading, addBanner]);

  const resetForm = () => {
    setIsVerified(false);
    setConfirmName("");
  };

  const handleClose = () => {
    resetForm();
    setShowWipeModal(false);
  };

  const handleCloseOnSuccess = () => {
    resetForm();
    setShowWipeModal(false);
  };

  const handleVerifyPassword = async (
    password: string,
    signal?: AbortSignal,
  ) => {
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password with enhanced retry logic
    await apiRequest("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: password,
      }),
      signal, // Add the AbortSignal to the fetch request
    });

    setIsVerified(true);
    addBanner({
      message: "Password verified. Please confirm the action.",
      type: "success",
      onClose: () => {},
      autoClose: true,
    });
  };

  const handleWipeData = async () => {
    if (!user || !userData) return;

    const expectedName = `${userData.first_name} ${userData.last_name}`
      .toLowerCase()
      .trim();
    const enteredName = confirmName.toLowerCase().trim();

    if (enteredName !== expectedName) {
      addBanner({
        message:
          "Name does not match. Please enter your full name exactly as shown.",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Wipe data with enhanced retry logic
      await apiRequest("/api/clerk/destructive-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          action: "delete_all_data",
        }),
      });

      addBanner({
        message: "All data has been successfully wiped",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });

      // Only close modal on success
      setTimeout(() => {
        handleCloseOnSuccess();
      }, 2000);
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.deleteUser("student"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      // Don't close modal on failure - let user retry without re-verification
    } finally {
      setIsLoading(false);
    }
  };

  // Backup functions
  const verifyBackupPassword = async (
    password: string,
    signal?: AbortSignal,
  ) => {
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password with enhanced retry logic
    await apiRequest("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: password,
      }),
      signal,
    });

    // Execute the pending action
    if (pendingBackupAction === "download") {
      await handleBackupDownload();
    } else if (pendingBackupAction === "restore") {
      setShowBackupModal(true);
    }

    // Close the password verification modal after successful verification
    setShowBackupPasswordVerify(false);
    setPendingBackupAction(null);
  };

  const initiateBackupAction = (action: "download" | "restore") => {
    setPendingBackupAction(action);
    setShowBackupPasswordVerify(true);
  };

  const handleBackupDownload = async () => {
    try {
      setIsDownloading(true);

      // Call API route for backup with enhanced retry logic
      const backup = await apiRequest("/api/convex/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instructorId }),
      });

      const key = await generateEncryptionKey();
      const keyString = await exportKey(key);
      const encryptedData = await encryptData(backup, key);

      // Create a new ZIP file
      const zip = new JSZip();
      zip.file("backup.enc", encryptedData);
      zip.file("backup.key", keyString);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = window.URL.createObjectURL(zipBlob);
      const zipLink = document.createElement("a");
      zipLink.href = zipUrl;
      zipLink.download = `doctask-backup-${new Date().toISOString()}.zip`;
      document.body.appendChild(zipLink);
      zipLink.click();
      window.URL.revokeObjectURL(zipUrl);
      document.body.removeChild(zipLink);

      addBanner({
        message:
          "Database backup has been successfully downloaded as a ZIP file. Keep it safe!",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, ErrorContexts.uploadFile());
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackupRestore = () => {
    initiateBackupAction("restore");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedZipFile(file);
    }
  };

  const confirmBackupRestore = async () => {
    if (!selectedZipFile) {
      addBanner({
        message: "Please select a backup ZIP file",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      return;
    }

    try {
      setIsRestoring(true);

      // Read and extract the ZIP file
      const zip = await JSZip.loadAsync(selectedZipFile);
      const encryptedData = await zip.file("backup.enc")?.async("text");
      const keyString = await zip.file("backup.key")?.async("text");
      if (!encryptedData || !keyString) {
        throw new Error("ZIP file must contain both backup.enc and backup.key");
      }

      // Import the key
      const key = await importKey(keyString);

      // Decrypt the backup
      const backup = (await decryptData(encryptedData, key)) as Record<
        string,
        unknown
      >;

      // Restore database backup with enhanced retry logic
      await apiRequest("/api/convex/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backup,
          instructorId: instructorId,
        }),
      });

      addBanner({
        message: "Database has been successfully restored!",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });

      // Only close modal on success
      setShowBackupModal(false);
      setSelectedZipFile(null);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, ErrorContexts.uploadFile());
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
      // Don't close modal on failure - let user retry without re-verification
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Profile Information
            </h1>
            <p className="text-gray-500">
              View and manage your account details
            </p>
          </div>
          <PrimaryProfile
            user={user}
            userData={userData}
            onSuccess={setSuccessMessage}
            onError={(msg) =>
              addBanner({
                message: msg,
                type: "error",
                onClose: () => {},
                autoClose: true,
              })
            }
            onUploading={setIsUploading}
          />

          {/* Backup & Restore Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaDatabase className="text-blue-500" />
                <span className="text-sm text-gray-600">Backup & Restore</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => initiateBackupAction("download")}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {isDownloading ? "Downloading..." : "Download Backup"}
                </button>
                <button
                  onClick={handleBackupRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {isRestoring ? "Restoring..." : "Restore Backup"}
                </button>
              </div>
            </div>
          </div>

          {/* Delete Data Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-red-500" />
                <span className="text-sm text-gray-600">Delete Data</span>
              </div>
              <button
                onClick={() => setShowWipeModal(true)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <FaTrash className="text-xs" />
                Wipe all data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      <PasswordVerification
        isOpen={showWipeModal && !isVerified}
        onClose={handleClose}
        onVerify={handleVerifyPassword}
        title="Wipe All Data"
        description="Enter your current password to continue with this destructive action."
        buttonText="Verify Password"
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      />

      {/* Confirmation Modal */}
      {showWipeModal && isVerified && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <FaExclamationTriangle />
                Wipe All Data
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-red-600 text-center">
                Are you absolutely sure you want to wipe all data? This action
                cannot be undone.
              </p>

              <div>
                <label
                  htmlFor="confirmName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type your full name to confirm:{" "}
                  <span className="font-semibold">
                    {userData?.first_name} {userData?.last_name}
                  </span>
                </label>
                <input
                  type="text"
                  id="confirmName"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your full name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipeData}
                  disabled={isLoading || !confirmName.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Wiping Data..." : "Yes, Wipe All Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Password Verification Modal */}
      <PasswordVerification
        isOpen={showBackupPasswordVerify}
        onClose={() => {
          setShowBackupPasswordVerify(false);
          setPendingBackupAction(null);
        }}
        onVerify={verifyBackupPassword}
        title="Verify Password"
        description={
          pendingBackupAction === "download"
            ? "Please enter your password to download the backup."
            : "Please enter your password to restore the backup."
        }
        buttonText="Verify Password"
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      />

      {/* Backup Restore Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                <FaDatabase />
                Restore Database
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select your backup ZIP file to restore the database. This will
                delete all existing data.
              </p>

              <div>
                <label
                  htmlFor="backup-zip-file"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Backup ZIP File
                </label>
                <input
                  type="file"
                  id="backup-zip-file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={isRestoring}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedZipFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedZipFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBackupModal(false);
                    setSelectedZipFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBackupRestore}
                  disabled={isRestoring || !selectedZipFile}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring ? "Restoring..." : "Restore Database"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorProfilePage;
