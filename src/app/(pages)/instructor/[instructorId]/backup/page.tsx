"use client";

import { Navbar } from "../components/navbar";
import { Download, Upload, Database } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useState, use } from "react";
import { useToast } from "@/hooks/use-toast";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface BackupUser {
  _id: string;
  role: number;
  clerk_id: string;
  email: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
  middle_name?: string;
  subrole?: number;
}

interface BackupData {
  tables: {
    users: BackupUser[];
    groups: unknown[];
    students: unknown[];
    advisers: unknown[];
    logs: unknown[];
  };
  timestamp: string;
  version: string;
}

interface BackupAndRestorePageProps {
  params: Promise<{ instructorId: string }>;
}

const BackupAndRestorePage = ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = use(params);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  
  const downloadConvexBackup = useMutation(api.mutations.downloadConvexBackup);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const backup = await downloadConvexBackup({ instructorId: instructorId as Id<"users"> });
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Database backup downloaded successfully",
      });
    } catch (error: unknown) {
      console.error("Failed to download database backup:", error);
      toast({
        title: "Error",
        description: "Failed to download database backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;

      // Validate backup format
      if (!backup.tables || !backup.timestamp || !backup.version) {
        throw new Error("Invalid backup format");
      }

      // Find the instructor ID from the backup
      const instructor = backup.tables.users.find((user: BackupUser) => user.role === 2);
      if (!instructor) {
        throw new Error("No instructor found in backup");
      }

      // Restore everything through the Convex restore endpoint
      const response = await fetch('/api/convex/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          backup,
          instructorId: instructor._id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore database backup');
      }

      const result = await response.json();
      
      // Show success message with user credentials if available
      if (result.users && result.users.length > 0) {
        toast({
          title: "Success",
          description: (
            <div>
              <p>Database backup restored successfully</p>
              <p className="mt-2 text-sm">New user credentials have been generated.</p>
            </div>
          ),
        });
      } else {
        toast({
          title: "Success",
          description: "Database backup restored successfully",
        });
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
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground">Download and restore your database backups</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Database Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
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
                <Download className="w-5 h-5" />
                {isDownloading ? "Downloading..." : "Download Backup"}
              </button>
              <div className="relative">
                <input
                  type="file"
                  id="database-restore"
                  className="hidden"
                  accept=".json,.backup"
                  onChange={handleRestore}
                  disabled={isRestoring}
                />
                <label
                  htmlFor="database-restore"
                  className={`w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors cursor-pointer ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-5 h-5" />
                  {isRestoring ? "Restoring..." : "Restore from Backup"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupAndRestorePage;
