import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadImageFile = async (
  file: File,
): Promise<ImageUploadResult> => {
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
      return {
        success: false,
        error:
          "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File too large. Maximum size is 5MB.",
      };
    }

    if (!sanitizedFileName || sanitizedFileName !== file.name) {
      return {
        success: false,
        error:
          "Invalid file name. Please use only letters, numbers, and basic punctuation.",
      };
    }

    // Create FormData and upload to our API
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || "Failed to upload image",
      };
    }

    const data = await response.json();

    if (data.success && data.image?.url) {
      return {
        success: true,
        url: data.image.url,
      };
    } else {
      return {
        success: false,
        error: "Invalid response from server",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
};
