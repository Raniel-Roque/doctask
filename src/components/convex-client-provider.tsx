"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    if (role === BigInt(2)) expectedPath = `/admin/${_id}/home`;
    else if (role === BigInt(1)) expectedPath = `/adviser/${_id}/home`;
    else if (role === BigInt(0)) expectedPath = `/student/${_id}/home`;

    if (pathname !== expectedPath) {
      router.replace(expectedPath);
    }
  }, [isLoaded, isSignedIn, user, convexUser, router, pathname]);

  return null;
}

function UnauthRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [router, pathname]);

  return null;
}

// New component to gate content rendering
function AuthStatusGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

  const convexUser = useQuery(api.documents.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  // Determine expected path based on role
  let expectedPath = "";
  if (convexUser) {
    const { role, _id } = convexUser;
    if (role === BigInt(2)) expectedPath = `/admin/${_id}/home`;
    else if (role === BigInt(1)) expectedPath = `/adviser/${_id}/home`;
    else if (role === BigInt(0)) expectedPath = `/student/${_id}/home`;
  }

  // Render children only when loaded, signed in, user and convexUser are available, AND on the expected path
  if (isLoaded && isSignedIn && user && convexUser && pathname === expectedPath) {
    return <>{children}</>;
  }

  return null;
}

// Auth check component that will be used inside ClerkProvider
function AuthCheck({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isLoginPage) {
      window.location.href = "/login";
    }
  }, [isLoaded, isSignedIn, isLoginPage]);

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
