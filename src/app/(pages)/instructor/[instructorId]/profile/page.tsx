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
import { FaExclamationTriangle, FaTrash } from "react-icons/fa";
import PasswordVerification from "@/app/(pages)/components/PasswordVerification";

interface InstructorProfilePageProps {
  params: Promise<{ instructorId: string }>;
}

const InstructorProfilePage = ({ params }: InstructorProfilePageProps) => {
  const { instructorId } = use(params);
  const { user } = useUser();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  // Fetch user data from Convex
  const userData = useQuery(api.fetch.getUserById, {
    id: instructorId as Id<"users">,
  });

  const resetForm = () => {
    setIsVerified(false);
    setConfirmName("");
    setNotification(null);
  };

  const handleClose = () => {
    resetForm();
    setShowWipeModal(false);
  };

  const handleVerifyPassword = async (
    password: string,
    signal?: AbortSignal,
  ) => {
    if (!user) {
      throw new Error("User not found");
    }

    const response = await fetch("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: password,
      }),
      signal, // Add the AbortSignal to the fetch request
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to verify password");
    }

    setIsVerified(true);
    setNotification({
      message: "Password verified. Please confirm the action.",
      type: "success",
    });
  };

  const handleWipeData = async () => {
    if (!user || !userData) return;

    const expectedName = `${userData.first_name} ${userData.last_name}`
      .toLowerCase()
      .trim();
    const enteredName = confirmName.toLowerCase().trim();

    if (enteredName !== expectedName) {
      setNotification({
        message:
          "Name does not match. Please enter your full name exactly as shown.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const response = await fetch("/api/clerk/destructive-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          action: "delete_all_data",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to wipe data");
      }

      setNotification({
        message: "All data has been successfully wiped",
        type: "success",
      });

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setNotification({
        message: err instanceof Error ? err.message : "Failed to wipe data",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
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

          {/* Instructor Commands Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-red-500" />
                <span className="text-sm text-gray-600">
                  Instructor Commands
                </span>
              </div>
              <button
                onClick={() => setShowWipeModal(true)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <FaTrash className="text-xs" />
                Wipe all data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      <PasswordVerification
        isOpen={showWipeModal && !isVerified}
        onClose={handleClose}
        onVerify={handleVerifyPassword}
        title="Wipe All Data"
        description="Enter your current password to continue with this destructive action."
        buttonText="Verify Password"
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      />

      {/* Confirmation Modal */}
      {showWipeModal && isVerified && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <FaExclamationTriangle />
                Wipe All Data
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-red-600 text-center">
                Are you absolutely sure you want to wipe all data? This action
                cannot be undone.
              </p>

              <div>
                <label
                  htmlFor="confirmName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type your full name to confirm:{" "}
                  <span className="font-semibold">
                    {userData?.first_name} {userData?.last_name}
                  </span>
                </label>
                <input
                  type="text"
                  id="confirmName"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your full name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipeData}
                  disabled={isLoading || !confirmName.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Wiping Data..." : "Yes, Wipe All Data"}
                </button>
              </div>
            </div>

            <NotificationBanner
              message={notification?.message || null}
              type={notification?.type || "success"}
              onClose={() => setNotification(null)}
              autoClose={notification?.type === "error" ? false : true}
            />
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      <NotificationBanner
        message={successMessage}
        type="success"
        onClose={() => setSuccessMessage(null)}
      />

      {/* Error Messages */}
      <NotificationBanner
        message={notification?.message || null}
        type={notification?.type || "error"}
        onClose={() => setNotification(null)}
        autoClose={notification?.type === "error" ? false : true}
      />
    </div>
  );
};

export default InstructorProfilePage;
