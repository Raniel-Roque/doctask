"use client";

import { Navbar } from "../components/navbar";
import { Download, Upload, Database, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useState, use } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { SuccessBanner } from "../../../components/SuccessBanner";

interface BackupAndRestorePageProps {
  params: Promise<{ instructorId: string }>;
}

const BackupAndRestorePage = ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = use(params);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const downloadConvexBackup = useMutation(api.mutations.downloadConvexBackup);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const backup = await downloadConvexBackup({ instructorId: instructorId as Id<"users"> });
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage("Database backup has been successfully downloaded.");
    } catch (error: unknown) {
      console.error("Failed to download database backup:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download database backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = () => {
    setShowRestoreConfirm(true);
    setSelectedFile(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const confirmRestore = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a backup file",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRestoring(true);

      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Read the file contents
      const fileContent = await selectedFile.text();
      let parsedBackup;
      try {
        parsedBackup = JSON.parse(fileContent);
      } catch {
        throw new Error("Invalid backup file format");
      }

      const response = await fetch('/api/convex/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          backup: parsedBackup,
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
        setSuccessMessage("Database has been successfully restored. New user credentials have been generated.");
      } else {
        setSuccessMessage("Database has been successfully restored.");
      }
    } catch (error: unknown) {
      console.error("Failed to restore database backup:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore database backup",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <SuccessBanner message={successMessage} onClose={() => setSuccessMessage(null)} />
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
                onClick={handleDownload}
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
              <li><b>Backup</b> lets you download a snapshot of all your database data.</li>
              <li><b>Restore</b> allows you to upload a backup file and overwrite your current data.</li>
            </ul>
            <div className="mb-2 text-gray-800 font-semibold">Precautions:</div>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Restoring will <b>delete all existing data</b></li>
              <li>Always download a backup before restoring, in case you need to revert.</li>
              <li>Restoring is <b>irreversible</b> and cannot be undone.</li>
              <li>Make sure you are uploading a valid backup file.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog 
        open={showRestoreConfirm} 
        onOpenChange={(open) => {
          if (!isRestoring) {
            setShowRestoreConfirm(open);
            if (!open) {
              setSelectedFile(null);
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
              Select a backup file to restore the database. This will delete all existing data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-2">
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
                  accept=".json,.backup"
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
              }}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRestore}
              disabled={!selectedFile || isRestoring}
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
