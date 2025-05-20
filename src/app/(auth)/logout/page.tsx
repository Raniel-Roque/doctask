"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";

const LogoutPage = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut().then(() => {
      router.push("/login");
    }).catch((error) => {
      console.error("Error signing out:", error);
    });
  }, [signOut, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-lg font-medium text-gray-700">Signing you out...</p>
    </div>
  );
};

export default LogoutPage;
