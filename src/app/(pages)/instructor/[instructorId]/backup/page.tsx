"use client";

import { Navbar } from "../components/navbar";
import { Download, Upload, Database, Shield } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useState, use } from "react";
import { useToast } from "@/hooks/use-toast";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface BackupAndRestorePageProps {
  params: Promise<{ instructorId: string }>;
}

const BackupAndRestorePage = ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = use(params);
  const [isDownloadingConvex, setIsDownloadingConvex] = useState(false);
  const [isDownloadingClerk, setIsDownloadingClerk] = useState(false);
  const { toast } = useToast();
  
  const downloadConvexBackup = useMutation(api.mutations.downloadConvexBackup);

  const handleConvexDownload = async () => {
    try {
      setIsDownloadingConvex(true);
      const backup = await downloadConvexBackup({ instructorId: instructorId as Id<"users"> });
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convex-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Convex backup downloaded successfully",
      });
    } catch (error: unknown) {
      console.error("Failed to download Convex backup:", error);
      toast({
        title: "Error",
        description: "Failed to download Convex backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingConvex(false);
    }
  };

  const handleClerkDownload = async () => {
    try {
      setIsDownloadingClerk(true);
      
      const response = await fetch('/api/clerk/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download Clerk backup');
      }

      const backup = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clerk-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Clerk backup downloaded successfully",
      });
    } catch (error: unknown) {
      console.error("Failed to download Clerk backup:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download Clerk backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingClerk(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Convex Database Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Convex Database</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Download your Convex database backup or restore from a previous backup file.
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleConvexDownload}
                disabled={isDownloadingConvex}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                {isDownloadingConvex ? "Downloading..." : "Download Backup"}
              </button>
              <div className="relative">
                <input
                  type="file"
                  id="convex-restore"
                  className="hidden"
                  accept=".json,.backup"
                />
                <label
                  htmlFor="convex-restore"
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  Restore from Backup
                </label>
              </div>
            </div>
          </div>

          {/* Clerk Database Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold">Clerk Database</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Download your Clerk user database backup or restore from a previous backup file.
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleClerkDownload}
                disabled={isDownloadingClerk}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                {isDownloadingClerk ? "Downloading..." : "Download Backup"}
              </button>
              <div className="relative">
                <input
                  type="file"
                  id="clerk-restore"
                  className="hidden"
                  accept=".json,.backup"
                />
                <label
                  htmlFor="clerk-restore"
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  Restore from Backup
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
