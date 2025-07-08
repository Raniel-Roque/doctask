"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/use-editor-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageIcon, UploadIcon, SearchIcon } from "lucide-react";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

export const CollaborativeImageButton = () => {
  const { editor } = useEditorStore();
  const [imageUrl, setImageUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    message: null,
    type: "info",
  });

  const showNotification = (
    message: string,
    type: NotificationState["type"],
  ) => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification({ message: null, type: "info" });
  };

  const onChange = (src: string) => {
    editor?.chain().focus().setImage({ src }).run();
  };

  const onUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);

      try {
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
          // Use the shared URL from Convex storage
          onChange(data.image.url);
          showNotification("Image uploaded successfully!", "success");
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        // Show error to user
        showNotification(
          error instanceof Error ? error.message : "Failed to upload image",
          "error",
        );
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      onChange(imageUrl);
      setImageUrl("");
      setIsEditing(false);
      showNotification("Image inserted successfully!", "success");
    }
  };

  return (
    <>
      <div className="print:hidden">
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                ) : (
                  <ImageIcon className="mt-0.5 size-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onUpload} disabled={isUploading}>
                <UploadIcon className="size-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                disabled={isUploading}
              >
                <SearchIcon className="size-4 mr-2" />
                Paste image URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert image</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image URL</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Insert image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleImageUrlSubmit();
              }
            }}
          />
          <DialogFooter>
            <Button onClick={handleImageUrlSubmit}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
