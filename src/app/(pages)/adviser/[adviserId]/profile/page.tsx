"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { FaCamera, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import Image from "next/image";
import { Cropper, ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // State for password reset
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetCode, setShowResetCode] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

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

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError("");
        setSuccessMessage("");

        try {
            // Check if new passwords match
            if (newPassword !== confirmPassword) {
                setError("New passwords do not match");
                return;
            }

            // Check password length
            if (newPassword.length < 8) {
                setError("Password must be at least 8 characters long");
                return;
            }

            // Call the reset password API
            const response = await fetch("/api/clerk/user-reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clerkId: user.id,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setSuccessMessage("Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordReset(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!user) return;
        setShowForgotPassword(true);
        setShowPasswordReset(false);
        setError("");
        setResetCode("");
        setLoading(true);

        try {
            // Send reset code to user's email
            const response = await fetch("/api/clerk/send-reset-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.primaryEmailAddress?.emailAddress
                })
            });

            if (!response.ok) {
                throw new Error("Failed to send reset code");
            }

            setSuccessMessage("A password reset code has been sent to your email. Please check your inbox and spam folder.");
            setShowResetCode(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send reset code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/clerk/verify-reset-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.primaryEmailAddress?.emailAddress,
                    code: resetCode
                })
            });

            if (!response.ok) {
                throw new Error("Invalid code. Please try again.");
            }

            setShowResetCode(false);
            setShowPasswordReset(true);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!user) return;
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/clerk/send-reset-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.primaryEmailAddress?.emailAddress
                })
            });

            if (!response.ok) {
                throw new Error("Failed to resend code");
            }

            setSuccessMessage("A new code has been sent to your email. Please check your inbox and spam folder.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to resend code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            setUploadError("Please select an image file");
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError("Image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const cropperRef = useRef<ReactCropperElement>(null);

    const onCrop = () => {
        const imageElement = cropperRef?.current;
        if (imageElement) {
            const cropper = imageElement.cropper;
            if (cropper) {
                const croppedData = cropper.getCroppedCanvas().toDataURL();
                setShowCropper(false);
                handleSaveImage(croppedData);
            }
        }
    };

    const handleSaveImage = async (imageData: string) => {
        if (!user) return;

        try {
            const response = await fetch("/api/clerk/change-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clerkId: user.id,
                    imageData: imageData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update profile picture");
            }

            setUploadSuccess("Profile picture updated successfully");
            setSelectedImage(null);
            
            // Refresh the page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to update profile picture");
        }
    };

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
                            <div className="relative group">
                                <div className="w-48 h-48 overflow-hidden border-4 border-[#B54A4A]">
                                    {user?.imageUrl ? (
                                        <Image
                                            src={user.imageUrl}
                                            alt="Profile"
                                            width={192}
                                            height={192}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-4xl text-gray-400">
                                                {user?.firstName?.[0] || "?"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <FaCamera className="text-white text-2xl" />
                                </button>
                            </div>

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
                                <div className="grid grid-cols-5 gap-4">
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
                                            onClick={() => setShowPasswordReset(true)}
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
                                ref={cropperRef}
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
                                onClick={onCrop}
                                className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A]"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Messages */}
            {uploadSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    {uploadSuccess}
                </div>
            )}
            {uploadError && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {uploadError}
                </div>
            )}

            {/* Password Reset Modal */}
            {showPasswordReset && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Password</h2>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="text-gray-400" />
                                </div>
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(sanitizeInput(e.target.value))}
                                    placeholder="Current Password"
                                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B54A4A] focus:border-[#B54A4A]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="text-gray-400" />
                                </div>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(sanitizeInput(e.target.value))}
                                    placeholder="New Password"
                                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B54A4A] focus:border-[#B54A4A]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(sanitizeInput(e.target.value))}
                                    placeholder="Confirm New Password"
                                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B54A4A] focus:border-[#B54A4A]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            {error && <div className="text-red-500 text-sm">{error}</div>}
                            {successMessage && <div className="text-green-500 text-sm">{successMessage}</div>}

                            <div className="flex justify-between items-center">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A] disabled:opacity-50"
                                >
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-[#B54A4A] hover:text-[#A43A3A] focus:outline-none"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reset Password</h2>
                        {showResetCode ? (
                            <form onSubmit={handleResetCodeSubmit} className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={resetCode}
                                        onChange={(e) => setResetCode(sanitizeInput(e.target.value))}
                                        placeholder="Enter verification code"
                                        className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B54A4A] focus:border-[#B54A4A]"
                                    />
                                </div>
                                {error && <div className="text-red-500 text-sm">{error}</div>}
                                {successMessage && <div className="text-green-500 text-sm">{successMessage}</div>}
                                <div className="flex justify-between items-center">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A] disabled:opacity-50"
                                    >
                                        {loading ? "Verifying..." : "Verify Code"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                        className="text-[#B54A4A] hover:text-[#A43A3A] focus:outline-none"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-600 mb-4">
                                    A verification code will be sent to your email address.
                                </p>
                                <button
                                    onClick={handleForgotPassword}
                                    disabled={loading}
                                    className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A] disabled:opacity-50"
                                >
                                    {loading ? "Sending..." : "Send Code"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
 
export default AdviserProfilePage;