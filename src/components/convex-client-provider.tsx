"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Role constants for better type safety
const ROLES = {
  STUDENT: BigInt(0),
  ADVISER: BigInt(1),
  ADMIN: BigInt(2),
} as const;

// Redirect authenticated users based on role
function RedirectHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const convexUser = useQuery(api.documents.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !convexUser) return;

    const { role, _id } = convexUser;
    let expectedPath = "";

    if (role === ROLES.ADMIN) expectedPath = `/admin/${_id}/home`;
    else if (role === ROLES.ADVISER) expectedPath = `/adviser/${_id}/home`;
    else if (role === ROLES.STUDENT) expectedPath = `/student/${_id}/home`;

    // Redirect to home if on root path or role root path
    if (pathname === "/" || pathname === `/${role === ROLES.ADMIN ? 'admin' : role === ROLES.ADVISER ? 'adviser' : 'student'}/${_id}`) {
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
    // Redirect to login if not signed in and not on login page
    if (isLoaded && !isSignedIn && pathname !== "/login") {
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
  const [error, setError] = useState<string | null>(null);

  const convexUser = useQuery(api.documents.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  // Validate role is within expected range
  const isValidRole = (role: bigint) => {
    return Object.values(ROLES).includes(role);
  };

  // Sanitize and validate path segments
  const sanitizePath = (path: string) => {
    // Remove any potential path traversal attempts
    return path.replace(/\.\./g, '').replace(/\/+/g, '/');
  };

  // Check if the current path matches the user's role base path
  const isAuthorizedPath = () => {
    if (!convexUser) return false;
    
    const { role, _id } = convexUser;
    
    // Validate role
    if (!isValidRole(role)) {
      setError("Invalid user role");
      return false;
    }

    // Sanitize path
    const sanitizedPath = sanitizePath(pathname);
    
    const basePath = role === ROLES.ADMIN ? 'admin' : role === ROLES.ADVISER ? 'adviser' : 'student';
    const pathPattern = new RegExp(`^/${basePath}/${_id}/`);
    
    return pathPattern.test(sanitizedPath);
  };

  // Render children when loaded, signed in, user and convexUser are available, AND on an authorized path
  if (isLoaded && isSignedIn && user && convexUser && isAuthorizedPath()) {
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
  const isLoginPage = pathname === "/login";

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Authenticated>
        <RedirectHandler />
        <AuthStatusGate>{children}</AuthStatusGate>
      </Authenticated>

      <Unauthenticated>
        <UnauthRedirect />
        {isLoginPage && children}
      </Unauthenticated>

      <AuthLoading>
        {isLoginPage ? (
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <AuthCheck>{children}</AuthCheck>
    </ClerkProvider>
  );
}
