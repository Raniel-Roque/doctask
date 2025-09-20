"use client";

import { Navbar } from "../components/navbar";
import { use, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import "cropperjs/dist/cropper.css";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { PrimaryProfile } from "@/app/(pages)/components/PrimaryProfile";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { SecondaryProfile } from "../../components/SecondaryProfile";

interface MemberProfilePageProps {
  params: Promise<{ studentId: string }>;
}

const MemberProfilePage = ({ params }: MemberProfilePageProps) => {
  const { studentId } = use(params);
  const { user } = useUser();
  const { addBanner } = useBannerManager();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user data from Convex
  const userData = useQuery(api.fetch.getUserById, {
    id: studentId as Id<"users">,
  });

  // Handle success messages
  useEffect(() => {
    if (successMessage) {
      addBanner({
        message: successMessage,
        type: "success",
        onClose: () => setSuccessMessage(null),
        autoClose: true,
      });
    }
  }, [successMessage, addBanner]);

  // Handle uploading notifications
  useEffect(() => {
    if (isUploading) {
      addBanner({
        message: "Uploading profile picture...",
        type: "info",
        onClose: () => {},
        autoClose: false,
      });
    }
  }, [isUploading, addBanner]);
  // Fetch student secondary profile data
  const studentProfile = useQuery(api.fetch.getStudentGroup, {
    userId: studentId as Id<"users">,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
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
            onError={(msg) =>
              addBanner({
                message: msg,
                type: "error",
                onClose: () => {},
                autoClose: true,
              })
            }
            onUploading={setIsUploading}
          />
          {/* Secondary Profile Section */}
          <div className="mb-4">
            <SecondaryProfile userData={studentProfile || undefined} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfilePage;
