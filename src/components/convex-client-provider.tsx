"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This component handles the redirect based on user role
function RedirectHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const convexUser = useQuery(api.documents.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !convexUser || hasRedirected) return;

    const { role, _id } = convexUser; // Get the user's role, and ID from Convex
    let redirectTo = "";

    // Route the user based on their role and subrole
    // 0 = student, 1 = adviser, 2 = admin

    if (role === BigInt(2)) {
      redirectTo = `/admin/${_id}/home`;
    } else if (role === BigInt(1)) {
      redirectTo = `/adviser/${_id}/home`;
    } else if (role === BigInt(0)) {
      redirectTo = `/student/${_id}/home`;
    }

    if (redirectTo) {
      setHasRedirected(true);
      router.replace(redirectTo); // Redirect to the correct page
    }
  }, [isLoaded, isSignedIn, user, convexUser, hasRedirected, router]);

  return null;
}

// If the user is unauthenticated, we'll redirect them to /login
function UnauthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // Redirect to /login if unauthenticated
  }, [router]);

  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Authenticated>
          <RedirectHandler /> {/* Handles redirect after sign-in */}
          {children}
        </Authenticated>

        <Unauthenticated>
          <UnauthRedirect /> {/* Redirects unauthenticated users to /login */}
          {children}
        </Unauthenticated>

        <AuthLoading>
          <div className="flex items-center justify-center min-h-screen">
            Loading authentication...
          </div>
        </AuthLoading>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}