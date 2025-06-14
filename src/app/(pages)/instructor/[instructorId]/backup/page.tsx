"use client";

import { Navbar } from "../components/navbar";
import { Download, Upload, Database, Loader2, Eye, EyeOff } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useState, use } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
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
import { generateEncryptionKey, exportKey, encryptData, importKey, decryptData } from "@/utils/encryption";
import JSZip from 'jszip';
import { useUser } from "@clerk/clerk-react";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface BackupAndRestorePageProps {
  params: Promise<{ instructorId: string }>;
}

const BackupAndRestorePage = ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = use(params);
  const { user } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showPasswordVerify, setShowPasswordVerify] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedKeyFile, setSelectedKeyFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | 'info' } | null>(null);
  const [pendingAction, setPendingAction] = useState<'download' | 'restore' | null>(null);
  const { getToken } = useAuth();
  
  const downloadConvexBackup = useMutation(api.mutations.downloadConvexBackup);

  const verifyPassword = async () => {
    if (!user) return;
    
    setIsVerifying(true);
    try {
      const sanitizedPassword = sanitizeInput(password, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true
      });

      const response = await fetch('/api/clerk/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          currentPassword: sanitizedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify password');
      }

      setShowPasswordVerify(false);
      setPassword('');
      
      // Execute the pending action
      if (pendingAction === 'download') {
        await handleDownload();
      } else if (pendingAction === 'restore') {
        setShowRestoreConfirm(true);
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : "Failed to verify password"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const initiateAction = (action: 'download' | 'restore') => {
    setPendingAction(action);
    setShowPasswordVerify(true);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const backup = await downloadConvexBackup({ instructorId: instructorId as Id<"users"> });
      
      const key = await generateEncryptionKey();
      const keyString = await exportKey(key);
      const encryptedData = await encryptData(backup, key);
      
      // Create a new ZIP file
      const zip = new JSZip();
      
      // Add the encrypted backup file
      zip.file("backup.enc", encryptedData);
      
      // Add the key file
      zip.file("backup.key", keyString);
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link for the ZIP file
      const zipUrl = window.URL.createObjectURL(zipBlob);
      const zipLink = document.createElement('a');
      zipLink.href = zipUrl;
      zipLink.download = `doctask-backup-${new Date().toISOString()}.zip`;
      document.body.appendChild(zipLink);
      zipLink.click();
      window.URL.revokeObjectURL(zipUrl);
      document.body.removeChild(zipLink);
      
      setNotification({
        type: 'success',
        message: "Database backup has been successfully downloaded as a ZIP file. Keep it safe!"
      });
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : "Failed to download database backup"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = () => {
    initiateAction('restore');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (event.target.id === 'backup-file') {
        setSelectedFile(file);
      } else if (event.target.id === 'key-file') {
        setSelectedKeyFile(file);
      }
    }
  };

  const confirmRestore = async () => {
    if (!selectedFile || !selectedKeyFile) {
      setNotification({
        type: 'error',
        message: "Please select both backup and key files"
      });
      return;
    }

    try {
      setIsRestoring(true);

      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Read the files
      const [encryptedData, keyString] = await Promise.all([
        selectedFile.text(),
        selectedKeyFile.text()
      ]);

      // Import the key
      const key = await importKey(keyString);

      // Decrypt the backup
      const backup = await decryptData(encryptedData, key);

      const response = await fetch('/api/convex/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          backup,
          instructorId: instructorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore database backup');
      }

      const result = await response.json();
      setShowRestoreConfirm(false);
      
      if (result.users && result.users.length > 0) {
        setNotification({
          type: 'success',
          message: "Database has been successfully restored. New user credentials have been generated."
        });
      } else {
        setNotification({
          type: 'success',
          message: "Database has been successfully restored."
        });
      }
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : "Failed to restore database backup"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <NotificationBanner
        message={notification?.message || null}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground">Download and restore your database backups</p>
        </div>

        <div className="flex flex-col md:flex-row md:justify-center md:gap-12 gap-8 max-w-6xl mx-auto md:px-4">
          {/* Main Backup/Restore Card */}
          <div className="bg-white rounded-lg shadow-md p-8 md:w-[60%]">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Database</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Download your database backup or restore from a previous backup file.
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => initiateAction('download')}
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
              <span className="inline-block bg-yellow-100 text-yellow-700 rounded-full px-2 py-1 text-xs font-semibold">Info</span>
              <h2 className="text-lg font-semibold">How Backup & Restore Works</h2>
            </div>
            <ul className="list-disc pl-5 text-gray-700 text-sm mb-3">
              <li><b>Backup</b> lets you download an encrypted snapshot of all your database data.</li>
              <li><b>Restore</b> allows you to upload a backup file and overwrite your current data.</li>
            </ul>
            <div className="mb-2 text-gray-800 font-semibold">Precautions:</div>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Restoring will <b>delete all existing data</b></li>
              <li>Always download a backup before restoring, in case you need to revert.</li>
              <li>Restoring is <b>irreversible</b> and cannot be undone.</li>
              <li>Make sure you are uploading a valid backup file.</li>
              <li>Keep your encryption key file safe - you&apos;ll need it to restore the backup.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Password Verification Dialog */}
      <Dialog 
        open={showPasswordVerify} 
        onOpenChange={(open) => {
          if (!isVerifying) {
            setShowPasswordVerify(open);
            if (!open) {
              setPassword('');
              setPendingAction(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verify Password</DialogTitle>
            <DialogDescription>
              Please enter your password to continue with this action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordVerify(false);
                setPassword('');
                setPendingAction(null);
              }}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={verifyPassword}
              disabled={!password || isVerifying}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog 
        open={showRestoreConfirm} 
        onOpenChange={(open) => {
          if (!isRestoring) {
            setShowRestoreConfirm(open);
            if (!open) {
              setSelectedFile(null);
              setSelectedKeyFile(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => {
          if (isRestoring) {
            e.preventDefault();
          }
        }} onEscapeKeyDown={(e) => {
          if (isRestoring) {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle>Restore Database</DialogTitle>
            <DialogDescription>
              Select your backup file and its corresponding key file to restore the database. This will delete all existing data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div>
              <Label htmlFor="backup-file">Select Backup File</Label>
              <label
                htmlFor="backup-file"
                className={`flex items-center gap-2 mt-2 px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors ${isRestoring ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} border-gray-300 w-full`}
                style={{ minHeight: 40 }}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span
                  className="truncate text-sm text-gray-700 overflow-hidden whitespace-nowrap"
                  style={{ maxWidth: 180, display: 'inline-block' }}
                  title={selectedFile?.name || ''}
                >
                  {selectedFile ? selectedFile.name : 'No file selected'}
                </span>
                <input
                  id="backup-file"
                  type="file"
                  accept=".enc"
                  onChange={handleFileSelect}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <Label htmlFor="key-file">Select Key File</Label>
              <label
                htmlFor="key-file"
                className={`flex items-center gap-2 mt-2 px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors ${isRestoring ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} border-gray-300 w-full`}
                style={{ minHeight: 40 }}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span
                  className="truncate text-sm text-gray-700 overflow-hidden whitespace-nowrap"
                  style={{ maxWidth: 180, display: 'inline-block' }}
                  title={selectedKeyFile?.name || ''}
                >
                  {selectedKeyFile ? selectedKeyFile.name : 'No file selected'}
                </span>
                <input
                  id="key-file"
                  type="file"
                  accept=".key"
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
                setSelectedFile(null);
                setSelectedKeyFile(null);
              }}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRestore}
              disabled={!selectedFile || !selectedKeyFile || isRestoring}
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
    </div>
  );
};

export default BackupAndRestorePage;
