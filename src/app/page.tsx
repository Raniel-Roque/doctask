"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api } from "../../convex/_generated/api";

// Role constants
const ROLES = {
  STUDENT: 0,
  ADVISER: 1,
  INSTRUCTOR: 2,
} as const;

const SmartRedirect = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const convexUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  useEffect(() => {
    if (!isLoaded) return;

    // If not signed in, redirect to login
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    // If signed in but no user data yet, wait
    if (!user || !convexUser) return;

    // If user is not verified, stay on login page
    if (!convexUser.email_verified) {
      router.replace("/login");
      return;
    }

    // Check if user has agreed to terms and privacy policy
    // If not agreed, don't redirect - let TermsAgreementWrapper handle it
    if (
      convexUser.terms_agreed !== true ||
      convexUser.privacy_agreed !== true
    ) {
      return; // Don't redirect, let TermsAgreementWrapper show the popup
    }

    // Determine the correct destination based on role and subrole
    const { role, subrole, _id } = convexUser;
    let destination = "";

    if (role === ROLES.INSTRUCTOR) {
      destination = `/instructor/${_id}/home`;
    } else if (role === ROLES.ADVISER) {
      destination = `/adviser/${_id}/home`;
    } else if (role === ROLES.STUDENT && typeof subrole === "number") {
      if (subrole === 0) {
        destination = `/student/${_id}/member/home`;
      } else if (subrole === 1) {
        destination = `/student/${_id}/manager/home`;
      }
    }

    // Only redirect if we have a valid destination
    if (destination) {
      router.replace(destination);
    }
  }, [isLoaded, isSignedIn, user, convexUser, router]);

  // Show minimal loading only if we're still determining the destination
  if (!isLoaded || (isSignedIn && (!user || !convexUser))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner size="md" text="Loading..." />
      </div>
    );
  }

  // Return null to prevent any flash of content
  return null;
};

export default SmartRedirect;
