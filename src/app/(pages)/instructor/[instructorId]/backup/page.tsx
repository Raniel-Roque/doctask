"use client";

import { Navbar } from "../components/navbar";
import { Download, Upload, Database, Loader2 } from "lucide-react";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NotificationBanner } from "../../../components/NotificationBanner";
import {
  generateEncryptionKey,
  exportKey,
  encryptData,
  importKey,
  decryptData,
} from "@/utils/encryption";
import JSZip from "jszip";
import { useUser, useClerk } from "@clerk/clerk-react";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { FaSignOutAlt } from "react-icons/fa";
import PasswordVerification from "@/app/(pages)/components/PasswordVerification";

interface BackupAndRestorePageProps {
  params: Promise<{ instructorId: string }>;
}

interface RestoreData {
  backupData: {
    tables: {
      logs: Array<{
        user_id: string;
        user_role: number;
        affected_entity_type: string;
        affected_entity_id: string;
        action: string;
        details: string;
      }>;
      users: Array<{
        _id: string;
        clerk_id: string;
        email: string;
        first_name: string;
        last_name: string;
        middle_name?: string;
        role: number;
        subrole?: number;
        isDeleted?: boolean;
        terms_agreed?: boolean;
        privacy_agreed?: boolean;
        terms_agreed_at?: number;
        privacy_agreed_at?: number;
      }>;
    };
  };
  idMappings: {
    oldUserIdToNewUserId: Record<string, string>;
    oldGroupIdToNewGroupId: Record<string, string>;
  };
}

const BackupAndRestorePage = ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = use(params);
  const { user } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showPasswordVerify, setShowPasswordVerify] = useState(false);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "download" | "restore" | null
  >(null);
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [restoreData, setRestoreData] = useState<RestoreData | null>(null);
  const { signOut } = useClerk();
  const router = useRouter();

  const verifyPassword = async (password: string, signal?: AbortSignal) => {
    if (!user) {
      throw new Error("User not found");
    }

    const sanitizedPassword = sanitizeInput(password, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });

    const response = await fetch("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: sanitizedPassword,
      }),
      signal, // Add the AbortSignal to the fetch request
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to verify password");
    }

    // Execute the pending action
    if (pendingAction === "download") {
      await handleDownload();
    } else if (pendingAction === "restore") {
      setShowRestoreConfirm(true);
    }
  };

  const initiateAction = (action: "download" | "restore") => {
    setPendingAction(action);
    setShowPasswordVerify(true);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Call API route for backup
      const response = await fetch("/api/convex/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instructorId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to download database backup",
        );
      }

      const backup = await response.json();

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

      setNotification({
        type: "success",
        message:
          "Database backup has been successfully downloaded as a ZIP file. Keep it safe!",
      });
    } catch (error: unknown) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to download database backup",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = () => {
    initiateAction("restore");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedZipFile(file);
    }
  };

  const confirmRestore = async () => {
    if (!selectedZipFile) {
      setNotification({
        type: "error",
        message: "Please select a backup ZIP file",
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
      const backup = await decryptData(encryptedData, key);

      const response = await fetch("/api/convex/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backup,
          instructorId: instructorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to restore database backup");
      }

      const restoreResult = await response.json();

      // Store the backup data and mappings for instructor restoration
      setRestoreData({
        backupData: restoreResult.backupData,
        idMappings: restoreResult.idMappings,
      });

      setShowRestoreConfirm(false);
      setShowRestoreSuccess(true);
    } catch (error: unknown) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to restore database backup",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLogoutConfirmation = async () => {
    setIsLoggingOut(true);
    try {
      // Call the restore-instructor API with the stored data
      const response = await fetch("/api/convex/restore-instructor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructorId,
          backupData: restoreData?.backupData,
          idMappings: restoreData?.idMappings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to restore instructor");
      }

      // Show success notification before logout
      setNotification({
        type: "success",
        message: "Restore completed successfully! Redirecting to login...",
      });

      // Add a small delay to ensure the notification is shown
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to sign out with fallback navigation and timeout
      const navigationTimeout = setTimeout(() => {
        localStorage.setItem("showRestoreBanner", "true");
        router.replace("/login");
      }, 5000); // 5 second timeout

      try {
        await signOut();
        clearTimeout(navigationTimeout);
        // If signOut succeeds, navigate
        localStorage.setItem("showRestoreBanner", "true");
        router.replace("/login");
      } catch {
        clearTimeout(navigationTimeout);
        localStorage.setItem("showRestoreBanner", "true");
        router.replace("/login");
      }
    } catch {
      setNotification({
        type: "error",
        message: "Failed to complete restore process. Please try again.",
      });
      setIsLoggingOut(false);
      setShowRestoreSuccess(false); // Ensure success dialog is closed
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <NotificationBanner
        message={notification?.message || null}
        type={notification?.type || "error"}
        onClose={() => setNotification(null)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground">
            Download and restore your database backups
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:justify-center md:gap-12 gap-8 max-w-6xl mx-auto md:px-4">
          {/* Main Backup/Restore Card */}
          <div className="bg-white rounded-lg shadow-md p-8 md:w-[60%]">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Database</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Download your database backup or restore from a previous backup
              file.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => initiateAction("download")}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isDownloading ? "Downloading..." : "Download Backup"}
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRestoring ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {isRestoring ? "Restoring..." : "Restore from Backup"}
              </button>
            </div>
          </div>
          {/* Info/Precautions Card */}
          <div className="bg-white rounded-lg shadow-md p-8 md:w-[70%]">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block bg-yellow-100 text-yellow-700 rounded-full px-2 py-1 text-xs font-semibold">
                Info
              </span>
              <h2 className="text-lg font-semibold">
                How Backup & Restore Works
              </h2>
            </div>
            <ul className="list-disc pl-5 text-gray-700 text-sm mb-3">
              <li>
                <b>Backup</b> lets you download an encrypted snapshot of all
                your database data.
              </li>
              <li>
                <b>Restore</b> allows you to upload a backup file and overwrite
                your current data.
              </li>
            </ul>
            <div className="mb-2 text-gray-800 font-semibold">Precautions:</div>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>
                Restoring will <b>delete all existing data</b>
              </li>
              <li>
                Always download a backup before restoring, in case you need to
                revert.
              </li>
              <li>
                Restoring is <b>irreversible</b> and cannot be undone.
              </li>
              <li>Make sure you are uploading a valid backup file.</li>
              <li>
                Keep your encryption key file safe - you&apos;ll need it to
                restore the backup.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      <PasswordVerification
        isOpen={showPasswordVerify}
        onClose={() => {
          setShowPasswordVerify(false);
          setPendingAction(null);
        }}
        onVerify={verifyPassword}
        title="Verify Password"
        description={
          pendingAction === "download"
            ? "Please enter your password to download the backup."
            : "Please enter your password to restore the backup."
        }
        buttonText="Verify Password"
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      />

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={showRestoreConfirm}
        onOpenChange={(open) => {
          if (!isRestoring) {
            setShowRestoreConfirm(open);
            if (!open) {
              setSelectedZipFile(null);
            }
          }
        }}
      >
        <DialogContent
          className={`sm:max-w-[425px] ${isRestoring ? "[&>button]:hidden" : ""}`}
          onPointerDownOutside={(e) => {
            if (isRestoring) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isRestoring) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Restore Database</DialogTitle>
            <DialogDescription>
              Select your backup ZIP file to restore the database. This will
              delete all existing data.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div>
              <Label htmlFor="backup-zip-file">Select Backup ZIP File</Label>
              <label
                htmlFor="backup-zip-file"
                className={`flex items-center gap-2 mt-2 px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors ${isRestoring ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"} border-gray-300 w-full`}
                style={{ minHeight: 40 }}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span
                  className="truncate text-sm text-gray-700 overflow-hidden whitespace-nowrap"
                  style={{ maxWidth: 180, display: "inline-block" }}
                  title={selectedZipFile?.name || ""}
                >
                  {selectedZipFile ? selectedZipFile.name : "No file selected"}
                </span>
                <input
                  id="backup-zip-file"
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreConfirm(false);
                setSelectedZipFile(null);
              }}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRestore}
              disabled={!selectedZipFile || isRestoring}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Confirm Restore"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Success Dialog */}
      <Dialog open={showRestoreSuccess} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center gap-3 mb-4">
            <FaSignOutAlt size={24} color="#B54A4A" />
            <h2 className="text-xl font-semibold text-gray-900">
              Restore Successful!
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            Your database has been successfully restored. You will be logged out
            and need to log back in with your new credentials.
          </p>

          <div className="flex justify-end">
            <button
              onClick={handleLogoutConfirmation}
              className="flex items-center gap-2 px-4 py-2 text-white bg-[#B54A4A] rounded-md hover:bg-[#9B3F3F] transition-colors"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  Logging out...
                </>
              ) : (
                <>
                  <FaSignOutAlt size={16} />
                  OK
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupAndRestorePage;
