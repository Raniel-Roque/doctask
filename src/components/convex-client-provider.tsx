"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClerkProvider, useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SessionTimeout } from "./session-timeout";
import { TermsAgreementWrapper } from "@/app/(pages)/components/TermsAgreementWrapper";
import { NetworkStatusBanner } from "@/app/(pages)/components/NetworkStatusBanner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Role constants for better type safety
const ROLES = {
  STUDENT: 0,
  ADVISER: 1,
  INSTRUCTOR: 2,
} as const;

type Role = (typeof ROLES)[keyof typeof ROLES];

// Redirect authenticated users based on role
function RedirectHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const convexUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !convexUser) return;

    const { role, subrole, _id } = convexUser;

    // Only redirect if user is on a generic role path (e.g., /student/123 without /member or /manager)
    const rolePath =
      role === ROLES.INSTRUCTOR
        ? "instructor"
        : role === ROLES.ADVISER
          ? "adviser"
          : "student";
    const genericRolePath = `/${rolePath}/${_id}`;

    if (pathname === genericRolePath) {
      let expectedPath = "";
      if (role === ROLES.INSTRUCTOR) {
        expectedPath = `/instructor/${_id}/home`;
      } else if (role === ROLES.ADVISER) {
        expectedPath = `/adviser/${_id}/home`;
      } else if (role === ROLES.STUDENT && typeof subrole === "number") {
        if (subrole === 0) {
          expectedPath = `/student/${_id}/member/home`;
        } else if (subrole === 1) {
          expectedPath = `/student/${_id}/manager/home`;
        }
      }

      if (expectedPath) {
        router.replace(expectedPath);
      }
    }
  }, [isLoaded, isSignedIn, user, convexUser, router, pathname]);

  return null;
}

function UnauthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Allow access to login page only
    const isPublicPath = pathname === "/login";
    if (isLoaded && !isSignedIn && !isPublicPath) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}

// Simplified component to gate content rendering
function AuthStatusGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const { signOut } = useClerk();

  const convexUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  // Validate role is within expected range
  const isValidRole = (role: number): role is Role => {
    return (
      role === ROLES.STUDENT ||
      role === ROLES.ADVISER ||
      role === ROLES.INSTRUCTOR
    );
  };

  // Check if the current path matches the user's role and subrole
  const isAuthorizedPath = () => {
    if (!convexUser) return false;

    const { role, subrole, _id } = convexUser;

    // Validate role
    if (!isValidRole(role)) {
      setError("Invalid user role");
      return false;
    }

    // For students, validate subrole
    if (role === ROLES.STUDENT) {
      const subrolePath = subrole === 0 ? "member" : "manager";
      const pathPattern = new RegExp(`^/student/${_id}/${subrolePath}/`);
      return pathPattern.test(pathname);
    }

    // For non-students, check their respective paths
    const basePath = role === ROLES.INSTRUCTOR ? "instructor" : "adviser";
    const pathPattern = new RegExp(`^/${basePath}/${_id}/`);
    return pathPattern.test(pathname);
  };

  // If not loaded yet, show nothing
  if (!isLoaded) {
    return null;
  }

  // If not signed in or no user data, show nothing (will be redirected by root page)
  if (!isSignedIn || !user) {
    return null;
  }

  // If user is not verified, show nothing (will be redirected by root page)
  if (convexUser && !convexUser.email_verified) {
    return null;
  }

  // If user is authenticated but not found in Convex database, show error
  if (isSignedIn && user && convexUser === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Account Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Your account could not be found in our database. This might happen
            if your account was recently created or if there was a system issue.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signOut()}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Sign Out
            </button>
            <p className="text-sm text-gray-500">
              Please contact support if this issue persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user is on root page and authenticated, allow it to render (for redirect logic)
  if (
    pathname === "/" &&
    isSignedIn &&
    user &&
    convexUser &&
    convexUser.email_verified
  ) {
    return <TermsAgreementWrapper>{children}</TermsAgreementWrapper>;
  }

  // If user is on login page but authenticated, allow redirect to happen
  if (
    pathname === "/login" &&
    isSignedIn &&
    user &&
    convexUser &&
    convexUser.email_verified
  ) {
    return <TermsAgreementWrapper>{children}</TermsAgreementWrapper>; // Allow login page to render for redirect
  }

  // Render children when all conditions are met (including path authorization)
  if (
    isLoaded &&
    isSignedIn &&
    user &&
    convexUser &&
    convexUser.email_verified &&
    isAuthorizedPath()
  ) {
    return <TermsAgreementWrapper>{children}</TermsAgreementWrapper>;
  }

  // If user is authenticated and verified but not on an authorized path,
  // still allow rendering so TermsAgreementWrapper can handle terms agreement
  if (
    isLoaded &&
    isSignedIn &&
    user &&
    convexUser &&
    convexUser.email_verified
  ) {
    return <TermsAgreementWrapper>{children}</TermsAgreementWrapper>;
  }

  // Show error message if there's an authorization error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authorization Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => signOut()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Auth check component that will be used inside ClerkProvider
function AuthCheck({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login";
  const [authSlow, setAuthSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAuthSlow(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <NetworkStatusBanner />
      <Authenticated>
        <SessionTimeout />
        <RedirectHandler />
        <AuthStatusGate>{children}</AuthStatusGate>
      </Authenticated>

      <Unauthenticated>
        <UnauthRedirect />
        {isPublicPage && children}
      </Unauthenticated>

      <AuthLoading>
        {isPublicPage ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center px-6">
            <div className="text-lg font-semibold">Loading authentication...</div>
            {authSlow && (
              <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                Taking longer than usual. Please check your internet connection.
              </div>
            )}
          </div>
        )}
      </AuthLoading>
    </ConvexProviderWithClerk>
  );
}

// Main Provider with Auth Gate
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <AuthCheck>{children}</AuthCheck>
    </ClerkProvider>
  );
}
