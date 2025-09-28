"use client";

import { useRouter } from "next/navigation";

interface UnauthorizedAccessProps {
  reason?: "deleted" | "version_snapshot" | "unauthorized";
}

const UnauthorizedAccess = ({
  reason = "unauthorized",
}: UnauthorizedAccessProps) => {
  const router = useRouter();

  const getMessage = () => {
    switch (reason) {
      case "deleted":
        return "This document has been deleted and is no longer accessible.";
      case "version_snapshot":
        return "You can only access the live version of this document.";
      case "unauthorized":
      default:
        return "You don't have permission to access this document.";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unauthorized Access
          </h1>
          <p className="text-gray-600 mb-6">{getMessage()}</p>
        </div>
        <button
          onClick={() => router.replace("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Return to Homepage
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedAccess;
