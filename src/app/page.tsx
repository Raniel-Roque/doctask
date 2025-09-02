"use client";

import { useEffect, useState } from "react";
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
  const [showReload, setShowReload] = useState(false);

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

  // Safety timeout: if auth/loading hangs too long, show reload UI
  useEffect(() => {
    const isWaiting = !isLoaded || (isSignedIn && (!user || !convexUser));
    if (isWaiting) {
      setShowReload(false);
      const id = setTimeout(() => setShowReload(true), 10000); // 10s
      return () => clearTimeout(id);
    } else {
      setShowReload(false);
    }
  }, [isLoaded, isSignedIn, user, convexUser]);

  // Show minimal loading only if we're still determining the destination
  if (!isLoaded || (isSignedIn && (!user || !convexUser))) {
    if (showReload) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <p className="text-gray-700 mb-4">Something went wrong while loading. Please reload.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
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
