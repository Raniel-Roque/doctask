import React, { useRef, useState } from "react";
import { FaCamera } from 'react-icons/fa';
import Image from "next/image";
import { Cropper, ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface User {
  id: string;
  imageUrl?: string;
  firstName?: string;
}

interface ProfilePictureUploaderProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({ 
  user,
  onSuccess,
  onError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sanitizedFileName = sanitizeInput(file.name, { 
      trim: true, 
      removeHtml: true, 
      escapeSpecialChars: true, 
      maxLength: 100 
    });

    // Only allow jpg, jpeg, png
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      onError("Please select a JPG or PNG image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onError("Image size should be less than 2MB");
      return;
    }

    if (!sanitizedFileName || sanitizedFileName !== file.name) {
      onError("Invalid file name");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

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
    setIsLoading(true);
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
      onSuccess("Profile picture updated successfully");
      setSelectedImage(null);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update profile picture");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        accept=".jpg,.jpeg,.png"
        className="hidden"
        disabled={isLoading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
        disabled={isLoading}
      >
        <FaCamera className="text-white text-2xl" />
      </button>
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
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={onCrop}
                className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 