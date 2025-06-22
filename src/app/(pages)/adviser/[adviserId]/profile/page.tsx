"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import "cropperjs/dist/cropper.css";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { PrimaryProfile } from "@/app/(pages)/components/PrimaryProfile";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface AdviserProfilePageProps {
  params: Promise<{ adviserId: string }>;
}

const AdviserProfilePage = ({ params }: AdviserProfilePageProps) => {
  const { adviserId } = use(params);
  const { user } = useUser();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);

  // Fetch user data from Convex
  const userData = useQuery(api.fetch.getUserById, {
    id: adviserId as Id<"users">,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar adviserId={adviserId} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Profile Information
            </h1>
            <p className="text-gray-500">
              View and manage your account details
            </p>
          </div>
          <PrimaryProfile
            user={user}
            userData={userData}
            onSuccess={setSuccessMessage}
            onError={(msg) => setNotification({ message: msg, type: "error" })}
          />
        </div>
      </div>
      {/* Success/Error Messages */}
      <NotificationBanner
        message={notification?.message || successMessage}
        type={notification?.type || "success"}
        onClose={() => {
          setNotification(null);
          setSuccessMessage(null);
        }}
      />
    </div>
  );
};

export default AdviserProfilePage;
