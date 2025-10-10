import { ProfilePictureUploader } from "./ProfilePictureUploader";
import React, { useState } from "react";
import type { UserResource } from "@clerk/types";
import type { Doc } from "../../../../convex/_generated/dataModel";
import ChangePassword from "./ChangePassword";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsOfService } from "./TermsOfService";
import { FaEdit, FaSave, FaTimes, FaSpinner } from "react-icons/fa";

interface PrimaryProfileProps {
  user: UserResource | null | undefined;
  userData: Doc<"users"> | null | undefined;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onUploading?: (isUploading: boolean) => void;
  // Profile editing props for capstone instructors
  isCapstoneInstructor?: boolean;
  isEditingProfile?: boolean;
  isSavingProfile?: boolean;
  profileFormData?: {
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
  };
  onEditProfile?: () => void;
  onCancelEdit?: () => void;
  onSaveProfile?: () => void;
  onProfileFieldChange?: (field: string, value: string) => void;
}

export const PrimaryProfile: React.FC<PrimaryProfileProps> = ({
  user,
  userData,
  onSuccess,
  onError,
  onUploading,
  // Profile editing props
  isCapstoneInstructor = false,
  isEditingProfile = false,
  isSavingProfile = false,
  profileFormData,
  onEditProfile,
  onCancelEdit,
  onSaveProfile,
  onProfileFieldChange,
}) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);

  // Change detection logic
  const isFieldChanged = (field: keyof Doc<"users">, formValue: string): boolean => {
    if (!userData) return false;
    
    const backendValue = userData[field];
    const normalizedBackendValue = backendValue?.toString().trim() || "";
    const normalizedFormValue = formValue?.toString().trim() || "";
    
    return normalizedFormValue !== normalizedBackendValue;
  };

  // Detect unsaved changes
  const hasUnsavedChanges = profileFormData ? [
    "first_name",
    "middle_name", 
    "last_name",
    "email"
  ].some((key) => isFieldChanged(key as keyof Doc<"users">, profileFormData[key as keyof typeof profileFormData])) : false;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mr-2">
          Primary Information
        </h2>
        {isCapstoneInstructor && !isEditingProfile && (
          <button
            onClick={onEditProfile}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit Profile"
          >
            <FaEdit className="h-4 w-4" />
          </button>
        )}
        {isCapstoneInstructor && isEditingProfile && hasUnsavedChanges && (
          <button
            type="button"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors"
            aria-label="Save"
            disabled={isSavingProfile}
            onClick={onSaveProfile}
          >
            {isSavingProfile ? (
              <FaSpinner className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FaSave className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm font-medium">
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </span>
          </button>
        )}
        {isCapstoneInstructor && isEditingProfile && (
          <button
            onClick={onCancelEdit}
            disabled={isSavingProfile}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 ml-2"
            title="Cancel"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        )}
      </div>
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
                value={isEditingProfile && profileFormData ? profileFormData.first_name : (userData?.first_name || "")}
                disabled={!isEditingProfile}
                onChange={isEditingProfile && onProfileFieldChange ? (e) => onProfileFieldChange("first_name", e.target.value) : undefined}
                className={`mt-1 block w-full px-3 py-2 border-2 rounded-md shadow-sm focus:outline-none transition-colors ${
                  isEditingProfile
                    ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    : "!bg-gray-100 border-gray-200 !text-gray-400 cursor-not-allowed focus:border-gray-300"
                }`}
                style={!isEditingProfile ? { backgroundColor: "#f3f4f6", color: "#9ca3af" } : {}}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Middle Name
              </label>
              <input
                type="text"
                value={isEditingProfile && profileFormData ? profileFormData.middle_name : (userData?.middle_name || "")}
                disabled={!isEditingProfile}
                onChange={isEditingProfile && onProfileFieldChange ? (e) => onProfileFieldChange("middle_name", e.target.value) : undefined}
                className={`mt-1 block w-full px-3 py-2 border-2 rounded-md shadow-sm focus:outline-none transition-colors ${
                  isEditingProfile
                    ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    : "!bg-gray-100 border-gray-200 !text-gray-400 cursor-not-allowed focus:border-gray-300"
                }`}
                style={!isEditingProfile ? { backgroundColor: "#f3f4f6", color: "#9ca3af" } : {}}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Last Name
              </label>
              <input
                type="text"
                value={isEditingProfile && profileFormData ? profileFormData.last_name : (userData?.last_name || "")}
                disabled={!isEditingProfile}
                onChange={isEditingProfile && onProfileFieldChange ? (e) => onProfileFieldChange("last_name", e.target.value) : undefined}
                className={`mt-1 block w-full px-3 py-2 border-2 rounded-md shadow-sm focus:outline-none transition-colors ${
                  isEditingProfile
                    ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    : "!bg-gray-100 border-gray-200 !text-gray-400 cursor-not-allowed focus:border-gray-300"
                }`}
                style={!isEditingProfile ? { backgroundColor: "#f3f4f6", color: "#9ca3af" } : {}}
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
                value={isEditingProfile && profileFormData ? profileFormData.email : (userData?.email || "")}
                disabled={!isEditingProfile}
                onChange={isEditingProfile && onProfileFieldChange ? (e) => onProfileFieldChange("email", e.target.value) : undefined}
                className={`mt-1 block w-full px-3 py-2 border-2 rounded-md shadow-sm focus:outline-none transition-colors ${
                  isEditingProfile
                    ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    : "!bg-gray-100 border-gray-200 !text-gray-400 cursor-not-allowed focus:border-gray-300"
                }`}
                style={!isEditingProfile ? { backgroundColor: "#f3f4f6", color: "#9ca3af" } : {}}
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
