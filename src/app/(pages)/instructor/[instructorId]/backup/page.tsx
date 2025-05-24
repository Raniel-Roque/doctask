import { Navbar } from "../components/navbar";
import { Download, Upload, Database, Shield } from "lucide-react";

interface BackupAndRestorePageProps {
  params: { instructorId: string };
}

const BackupAndRestorePage = async ({ params }: BackupAndRestorePageProps) => {
  const { instructorId } = await params;

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
              <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                <Download className="w-5 h-5" />
                Download Backup
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
              <button className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                <Download className="w-5 h-5" />
                Download Backup
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

        {/* Backup Information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Backup Information</h2>
          <div className="space-y-4 text-gray-600">
            <p>• Backups are encrypted and stored locally on your device</p>
            <p>• Keep your backup files in a secure location</p>
            <p>• Regular backups are recommended to prevent data loss</p>
            <p>• Backup files contain sensitive information - handle with care</p>
          </div>
          </div>
      </div>
    </div>
  );
};

export default BackupAndRestorePage;
