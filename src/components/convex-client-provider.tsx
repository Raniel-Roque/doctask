"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SessionTimeout } from "./session-timeout";

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

    if (
      pathname === "/" ||
      pathname ===
        `/${role === ROLES.INSTRUCTOR ? "instructor" : role === ROLES.ADVISER ? "adviser" : "student"}/${_id}`
    ) {
      router.replace(expectedPath);
    }
  }, [isLoaded, isSignedIn, user, convexUser, router, pathname]);

  return null;
}

function UnauthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Allow access to login and forgot-password pages only
    const publicPages = ["/login", "/forgot-password"];
    if (isLoaded && !isSignedIn && !publicPages.includes(pathname)) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}

// New component to gate content rendering
function AuthStatusGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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

  // Sanitize and validate path segments
  const sanitizePath = (path: string) => {
    return path.replace(/\.\./g, "").replace(/\/+/g, "/");
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
      // Sanitize path and check student path
      const sanitizedPath = sanitizePath(pathname);
      const subrolePath = subrole === 0 ? "member" : "manager";
      const pathPattern = new RegExp(`^/student/${_id}/${subrolePath}/`);
      return pathPattern.test(sanitizedPath);
    }

    // For non-students, check their respective paths
    const sanitizedPath = sanitizePath(pathname);
    const basePath = role === ROLES.INSTRUCTOR ? "instructor" : "adviser";
    const pathPattern = new RegExp(`^/${basePath}/${_id}/`);
    return pathPattern.test(sanitizedPath);
  };

  useEffect(() => {
    if (isLoaded) {
      // If not signed in, redirect to login regardless of the path
      if (!isSignedIn) {
        router.replace("/login");
        return;
      }

      // If signed in but no user data, also redirect to login
      if (!user) {
        router.replace("/login");
        return;
      }

      // If signed in and has user data, check verification status
      // If not verified, stay on /login (handled by login page step logic)
    }
  }, [isLoaded, isSignedIn, user, convexUser, pathname, router]);

  // If not loaded yet, show nothing
  if (!isLoaded) {
    return null;
  }

  // If not signed in or no user data, show nothing (will be redirected by useEffect)
  if (!isSignedIn || !user) {
    return null;
  }

  // Render children when loaded, signed in, user and convexUser are available, AND on an authorized path and verified
  if (
    isLoaded &&
    isSignedIn &&
    user &&
    convexUser &&
    isAuthorizedPath() &&
    convexUser.email_verified
  ) {
    return <>{children}</>;
  }

  // Show error message if there's an authorization error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-red-500 text-lg font-semibold">{error}</div>
      </div>
    );
  }

  return null;
}

// Auth check component that will be used inside ClerkProvider
function AuthCheck({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicPages = ["/login"];
  const isPublicPage = publicPages.includes(pathname);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
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
          <div className="flex items-center justify-center min-h-screen bg-white text-lg font-semibold">
            Loading authentication...
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
