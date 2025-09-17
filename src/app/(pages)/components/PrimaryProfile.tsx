import { ProfilePictureUploader } from "./ProfilePictureUploader";
import React, { useState } from "react";
import type { UserResource } from "@clerk/types";
import type { Doc } from "../../../../convex/_generated/dataModel";
import ChangePassword from "./ChangePassword";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsOfService } from "./TermsOfService";

interface PrimaryProfileProps {
  user: UserResource | null | undefined;
  userData: Doc<"users"> | null | undefined;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onUploading?: (isUploading: boolean) => void;
}

export const PrimaryProfile: React.FC<PrimaryProfileProps> = ({
  user,
  userData,
  onSuccess,
  onError,
  onUploading,
}) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Primary Information
      </h2>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        {/* Profile Picture Section */}
        {user && (
          <ProfilePictureUploader
            user={{
              id: user.id,
              imageUrl: user.imageUrl ?? undefined,
              firstName: user.firstName ?? undefined,
            }}
            onSuccess={onSuccess}
            onError={onError}
            onUploading={onUploading}
          />
        )}

        {/* User Information Section */}
        <div className="flex-1 space-y-6">
          {/* Names Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                First Name
              </label>
              <input
                type="text"
                value={userData?.first_name || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-md shadow-sm text-gray-700 cursor-not-allowed focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Middle Name
              </label>
              <input
                type="text"
                value={userData?.middle_name || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-md shadow-sm text-gray-700 cursor-not-allowed focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Last Name
              </label>
              <input
                type="text"
                value={userData?.last_name || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-md shadow-sm text-gray-700 cursor-not-allowed focus:border-gray-300"
              />
            </div>
          </div>

          {/* Email and Password Row */}
          <div className="grid grid-cols-5 gap-4 mb-2">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-500">
                Email
              </label>
              <input
                type="email"
                value={userData?.email || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-md shadow-sm text-gray-700 cursor-not-allowed focus:border-gray-300"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A]"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Privacy and Terms */}
          <div className="text-sm text-gray-500 flex justify-center items-center mt-2">
            <span>By using this service, you agree to our&nbsp;</span>
            <button
              onClick={() => setIsPrivacyPolicyOpen(true)}
              className="text-[#B54A4A] hover:text-[#A43A3A] underline cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>&nbsp;and&nbsp;</span>
            <button
              onClick={() => setIsTermsOfServiceOpen(true)}
              className="text-[#B54A4A] hover:text-[#A43A3A] underline cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePassword
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicy
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
        context="profile"
      />

      {/* Terms of Service Modal */}
      <TermsOfService
        isOpen={isTermsOfServiceOpen}
        onClose={() => setIsTermsOfServiceOpen(false)}
        context="profile"
      />
    </div>
  );
};
