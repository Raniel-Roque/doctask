import { ProfilePictureUploader } from "./ProfilePictureUploader";
import React from "react";
import type { UserResource } from "@clerk/types";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PrimaryProfileProps {
  user: UserResource | null | undefined;
  userData: Doc<"users"> | null | undefined;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const PrimaryProfile: React.FC<PrimaryProfileProps> = ({ user, userData, onSuccess, onError }) => (
  <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
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
        />
      )}

      {/* User Information Section */}
      <div className="flex-1 space-y-6">
        {/* Names Row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={userData?.first_name || ""}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Middle Name</label>
            <input
              type="text"
              value={userData?.middle_name || ""}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={userData?.last_name || ""}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500"
            />
          </div>
        </div>

        {/* Email and Password Row */}
        <div className="grid grid-cols-5 gap-4 mb-2">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={userData?.email || ""}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500"
            />
          </div>
          <div className="col-span-2 flex items-end">
            <button
              onClick={() => {}}
              className="w-full px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A]"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Privacy and Terms */}
        <div className="text-sm text-gray-500 flex justify-center items-center mt-2">
          <span>By using this service, you agree to our&nbsp;</span>
          <span className="text-[#B54A4A] hover:text-[#A43A3A] underline cursor-pointer">
            Privacy Policy
          </span>
          <span>&nbsp;and&nbsp;</span>
          <span className="text-[#B54A4A] hover:text-[#A43A3A] underline cursor-pointer">
            Terms of Service
          </span>
        </div>
      </div>
    </div>
  </div>
); 