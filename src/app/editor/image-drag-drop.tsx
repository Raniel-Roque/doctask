"use client";

import { useState } from "react";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { useEditorStore } from "@/store/use-editor-store";
import { apiRequest } from "@/lib/utils";

interface ImageUploadResponse {
  success: boolean;
  image?: {
    url: string;
  };
}


interface ImageDragDropWrapperProps {
  children: React.ReactNode;
  isEditable?: boolean;
}

export const ImageDragDropWrapper = ({
  children,
  isEditable = true,
}: ImageDragDropWrapperProps) => {
  const { editor } = useEditorStore();
  const { addBanner } = useBannerManager();
  const [isDragOver, setIsDragOver] = useState(false);

  // Helper function to show notifications using the new banner system
  const showNotification = (message: string, type: "error" | "success" | "warning" | "info") => {
    addBanner({
      message,
      type,
      onClose: () => {}, // Banner will auto-close
      autoClose: true,
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Validate and sanitize file
      const sanitizedFileName = sanitizeInput(file.name, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
        maxLength: 100,
      });

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        showNotification(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
          "error",
        );
        return null;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showNotification("File too large. Maximum size is 5MB.", "error");
        return null;
      }

      if (!sanitizedFileName || sanitizedFileName !== file.name) {
        showNotification(
          "Invalid file name. Please use only letters, numbers, and basic punctuation.",
          "error",
        );
        return null;
      }

      showNotification("Uploading image...", "info");

      // Create FormData and upload to our API
      const formData = new FormData();
      formData.append("file", file);

      // Upload image with enhanced retry logic
      const data = await apiRequest<ImageUploadResponse>("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (data.success && data.image?.url) {
        showNotification("Image uploaded successfully!", "success");
        return data.image.url;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, ErrorContexts.uploadFile());
      showNotification(errorMessage, "error");
      return null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Disable all drag operations in view-only mode
    if (!isEditable) {
      return;
    }

    // Only handle external file drops, not internal editor operations
    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    const hasEditorContent = Array.from(e.dataTransfer.types).some(
      (type) =>
        type.includes("text/html") ||
        type.includes("text/plain") ||
        type.includes("application/x-pm-slice"),
    );

    // If it's internal editor content being moved, don't interfere
    if (hasEditorContent && !hasFiles) {
      return;
    }

    // If it has actual files from outside, handle it
    if (hasFiles && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only handle if we're actually in a drag over state for file uploads
    if (!isDragOver) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Only hide overlay if leaving the main container
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeavingContainer =
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom;

    if (isLeavingContainer) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    // Disable all drop operations in view-only mode
    if (!isEditable) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Check if this is an internal editor operation
    const hasEditorContent = Array.from(e.dataTransfer.types).some(
      (type) =>
        type.includes("text/html") ||
        type.includes("text/plain") ||
        type.includes("application/x-pm-slice"),
    );

    // If it's internal editor content being moved, don't interfere
    if (
      hasEditorContent &&
      (!e.dataTransfer.files || e.dataTransfer.files.length === 0)
    ) {
      return;
    }

    // Only handle external file drops
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      showNotification("Please drop image files only.", "warning");
      return;
    }

    // Don't proceed if editor is not available
    if (!editor) {
      showNotification("Editor not ready. Please try again.", "warning");
      return;
    }

    for (const file of imageFiles) {
      const url = await uploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

  return (
    <div
      className="relative min-h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center pointer-events-none print:hidden">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
            <div className="text-4xl mb-4">📸</div>
            <p className="text-xl font-semibold text-blue-600 mb-2">
              Drop images here to upload
            </p>
            <p className="text-sm text-gray-600">
              Supports JPEG, PNG, GIF, and WebP
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum size: 5MB per image
            </p>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
