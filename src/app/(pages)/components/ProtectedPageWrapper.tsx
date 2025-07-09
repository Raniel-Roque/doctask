"use client";

import React from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { TermsAgreementWrapper } from "./TermsAgreementWrapper";

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
}

export const ProtectedPageWrapper: React.FC<ProtectedPageWrapperProps> = ({
  children,
}) => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black border-solid" />
          <p className="text-gray-600 text-lg font-medium">
            Loading Application...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    router.replace("/login");
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black border-solid" />
          <p className="text-gray-600 text-lg font-medium">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // If signed in, check terms agreement
  return <TermsAgreementWrapper>{children}</TermsAgreementWrapper>;
};
