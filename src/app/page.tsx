"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";

const LoadingPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black border-solid" />
        <p className="text-gray-600 text-lg font-medium">Loading Application...</p>
      </div>
    </div>
  );
};

export default LoadingPage;
