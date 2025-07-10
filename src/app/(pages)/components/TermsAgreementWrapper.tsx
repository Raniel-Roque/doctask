import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { TermsAndService } from "./TermsAndService";
import { useClerk } from "@clerk/clerk-react";

interface TermsAgreementWrapperProps {
  children: React.ReactNode;
}

export const TermsAgreementWrapper: React.FC<TermsAgreementWrapperProps> = ({
  children,
}) => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [showTerms, setShowTerms] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserAgreement = async () => {
      if (!isLoaded || !user) {
        setIsChecking(false);
        return;
      }

      try {
        // Get user from Convex by email
        const response = await fetch(
          `/api/convex/get-user-by-email?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`,
        );
        const data = await response.json();

        if (data.user) {
          // Check if user has agreed to both terms and privacy policy
          const hasAgreed =
            data.user.terms_agreed === true &&
            data.user.privacy_agreed === true;

          if (!hasAgreed) {
            setShowTerms(true);
          }
        } else {
          // If user not found in Convex, show terms
          setShowTerms(true);
        }
      } catch {
        // If error, show terms to be safe
        setShowTerms(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkUserAgreement();
  }, [isLoaded, user]);

  const handleAgree = () => {
    setShowTerms(false);
  };

  const handleDisagree = async () => {
    try {
      await signOut();
    } catch {}
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B54A4A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show terms popup if user hasn't agreed
  if (showTerms) {
    return (
      <TermsAndService
        isOpen={showTerms}
        onAgree={handleAgree}
        onDisagree={handleDisagree}
      />
    );
  }

  // Show children if user has agreed
  return <>{children}</>;
};
