"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Cropper } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { SuccessBanner } from "@/app/(pages)/components/SuccessBanner";
import { Notification } from "@/app/(pages)/components/Notification";
import { ProfilePictureUploader } from "@/app/(pages)/adviser/[adviserId]/profile/components/ProfilePictureUploader";

interface UserData {
    _id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
}

interface AdviserProfilePageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserProfilePage = ({ params }: AdviserProfilePageProps) => {
    const { adviserId } = use(params);
    const { user } = useUser();
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [successBanner, setSuccessBanner] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    // Fetch user data from Convex
    const [userData, setUserData] = useState<UserData | null>(null);
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch("/api/convex/get-user-by-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress })
                });
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                }
            } catch {
                console.error("Error fetching user data");
            }
        };
        if (user?.primaryEmailAddress?.emailAddress) {
            fetchUserData();
        }
    }, [user]);

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar adviserId={adviserId} />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Profile Information</h1>
                        <p className="text-gray-500">View and manage your account details</p>
                    </div>
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
                                            value={user?.primaryEmailAddress?.emailAddress || ""}
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
                </div>
            </div>

            {/* Image Cropper Modal */}
            {showCropper && selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Crop Image</h2>
                        <div className="mb-4">
                            <Cropper
                                src={selectedImage}
                                style={{ height: 400, width: '100%' }}
                                aspectRatio={1}
                                guides={true}
                                cropBoxResizable={true}
                                cropBoxMovable={true}
                                viewMode={1}
                                autoCropArea={1}
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => {
                                    setShowCropper(false);
                                    setSelectedImage(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A]"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Messages */}
            <SuccessBanner message={successBanner} onClose={() => setSuccessBanner(null)} />
            <Notification message={notification} type="error" onClose={() => setNotification(null)} />
        </div>
    );
};
 
export default AdviserProfilePage;