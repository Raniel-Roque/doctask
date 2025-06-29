"use client";

import { useState } from "react";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { useEditorStore } from "@/store/use-editor-store";

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

interface ImageDragDropWrapperProps {
  children: React.ReactNode;
}

export const ImageDragDropWrapper = ({
  children,
}: ImageDragDropWrapperProps) => {
  const { editor } = useEditorStore();
  const [notification, setNotification] = useState<NotificationState>({
    message: null,
    type: "info",
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const showNotification = (
    message: string,
    type: NotificationState["type"],
  ) => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification({ message: null, type: "info" });
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

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();

      if (data.success && data.image?.url) {
        showNotification("Image uploaded successfully!", "success");
        return data.image.url;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to upload image",
        "error",
      );
      return null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragged items contain files
    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    if (hasFiles) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
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
      <NotificationBanner
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />

      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center pointer-events-none">
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
