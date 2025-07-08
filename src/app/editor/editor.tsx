"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";
import "./editor.css";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import StarterKit from "@tiptap/starter-kit";
import ResizeImage from "tiptap-extension-resize-image";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { FontSizeExtension } from "@/extensions/font-size";
import { LineHeightExtension } from "@/extensions/line-height";
import { CollaborativeHighlighting } from "@/extensions/collaborative-highlighting";
import { useEditorStore } from "@/store/use-editor-store";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { useOthers, useSelf, useMyPresence } from "@liveblocks/react/suspense";
import { Threads } from "./threads";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

// Custom hook to handle room presence and trigger external save
const useRoomPresence = (others: readonly unknown[], self: unknown) => {
  const isLastUserInRoom = others.length === 0 && self !== null;
  const hasOtherUsers = others.length > 0;

  useEffect(() => {
    if (isLastUserInRoom) {
      // Dispatch a custom event that can be listened to by parent components
      const saveEvent = new CustomEvent("liveblocks-last-user", {
        detail: { isLastUser: true },
      });
      window.dispatchEvent(saveEvent);
    }
  }, [isLastUserInRoom]);

  // Dispatch room activity events for smart auto-save
  useEffect(() => {
    const activityEvent = new CustomEvent("liveblocks-room-activity", {
      detail: { hasOthers: hasOtherUsers },
    });
    window.dispatchEvent(activityEvent);
  }, [hasOtherUsers]);

  return { isLastUserInRoom, hasOtherUsers };
};

// Helper function to convert hex color to rgba with transparency
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface EditorProps {
  initialContent?: string;
  isEditable?: boolean;
  userType?: "manager" | "member" | "adviser";
  suppressReadOnlyBanner?: boolean;
}

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

export const Editor = ({
  initialContent,
  isEditable = true,
  userType = "manager",
  suppressReadOnlyBanner = false,
}: EditorProps) => {
  const { setEditor } = useEditorStore();
  const liveblocks = useLiveblocksExtension({
    initialContent,
    offlineSupport_experimental: true,
  });
  const self = useSelf();
  const others = useOthers();
  const [, setMyPresence] = useMyPresence();
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
      showNotification(
        error instanceof Error ? error.message : "Failed to upload image",
        "error",
      );
      return null;
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: isEditable, // Disable editing when isEditable is false
    editorProps: {
      attributes: {
        style:
          "padding-left: 56px; padding-right:56px; font-family: 'Times New Roman', serif; font-size: 11px; line-height: 1.5; text-align: justify;",
        class: `focus:outline-none bg-white border border-[#C7C7C7] print:border-none print:shadow-none print:m-0 print:p-0 flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 ${isEditable ? "cursor-text" : "cursor-default"}`,
      },
      handleDrop: (view, event, slice, moved) => {
        // Disable all drop operations in view-only mode
        if (!isEditable) {
          event.preventDefault();
          return true; // Prevent default handling
        }

        // If it's an internal move (repositioning existing content), let the default handler deal with it
        if (moved) {
          return false; // Let ProseMirror handle internal moves efficiently
        }

        // Only handle external file drops
        if (
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadImage(file).then((url) => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });
                if (coordinates) {
                  const node = schema.nodes.image.create({
                    src: url,
                    // Add attributes to prevent reloading
                    loading: "lazy",
                    decoding: "async",
                  });
                  const transaction = view.state.tr.insert(
                    coordinates.pos,
                    node,
                  );
                  view.dispatch(transaction);
                }
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Disable paste operations in view-only mode
        if (!isEditable) {
          event.preventDefault();
          return true; // Prevent default handling
        }

        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadImage(file).then((url) => {
                if (url) {
                  const { schema } = view.state;
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              });
              return true;
            }
          }
        }
        return false;
      },
      // Disable all key events in view-only mode
      handleKeyDown: (view, event) => {
        if (!isEditable) {
          // Allow only navigation keys and modifier keys
          const allowedKeys = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "PageUp",
            "PageDown",
            "Tab",
            "Escape",
            "F1",
            "F2",
            "F3",
            "F4",
            "F5",
            "F6",
            "F7",
            "F8",
            "F9",
            "F10",
            "F11",
            "F12",
            "Control",
            "Alt",
            "Shift",
            "Meta",
          ];

          if (!allowedKeys.includes(event.key)) {
            event.preventDefault();
            return true; // Prevent default handling
          }
        }
        return false; // Let default handler deal with allowed keys
      },
      // Disable mouse interactions that could modify content in view-only mode
      handleClick: () => {
        if (!isEditable) {
          // Allow clicks for navigation but prevent any content modification
          // The editable: false should handle most cases, but this is extra protection
          return false; // Let default handler deal with it
        }
        return false; // Let default handler deal with it
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5],
        },
        history: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableCell,
      TableHeader,
      ResizeImage.configure({
        allowBase64: true,
        // Prevent unnecessary re-renders during drag operations
        HTMLAttributes: {
          loading: "lazy",
          decoding: "async",
          draggable: isEditable, // Only allow dragging when editable
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "justify",
      }),
      Underline,
      FontSizeExtension,
      LineHeightExtension.configure({
        types: ["paragraph", "heading"],
        defaultLineHeight: "1.5",
      }),
      liveblocks,
      CollaborativeHighlighting.configure({
        others: others as ReadonlyArray<{
          id: string;
          presence: {
            cursor: { x: number; y: number } | null;
            selection: {
              from: number;
              to: number;
              color: string;
            } | null;
          };
          info?: {
            name?: string;
            avatar?: string;
            color?: string;
          };
        }>,
      }),
    ],
  });

  // Track selection changes for collaborative highlighting (only if editable)
  useEffect(() => {
    if (!editor) return;

    if (!isEditable) {
      // Clear any existing selection when in view-only mode
      setMyPresence({ selection: null });
      return;
    }

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;

      // Only update presence if selection is not empty
      if (from !== to) {
        setMyPresence({
          selection: {
            from,
            to,
            color: hexToRgba(self?.info?.color || "#3B82F6", 0.15),
          },
        });
      } else {
        // Clear selection when nothing is selected
        setMyPresence({ selection: null });
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, setMyPresence, self?.info?.color, isEditable]);

  // Update the collaborative highlighting extension when others change
  useEffect(() => {
    if (editor) {
      const collaborativeHighlightingExtension =
        editor.extensionManager.extensions.find(
          (ext) => ext.name === "collaborativeHighlighting",
        );

      if (collaborativeHighlightingExtension) {
        // Update the extension's options
        collaborativeHighlightingExtension.options.others = others;
        // Force update decorations
        editor.view.dispatch(editor.state.tr);
      }
    }
  }, [editor, others]);

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
    return () => {
      setEditor(null);
    };
  }, [editor, setEditor]);

  // Room presence tracking
  useRoomPresence(others, self);

  const getReadOnlyMessage = () => {
    if (userType === "member") {
      return "You are viewing this document in read-only mode. You need to be assigned to a related task to edit.";
    }
    return "You are viewing this document in read-only mode.";
  };

  return (
    <>
      {!isEditable && !suppressReadOnlyBanner && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 text-sm text-center w-full">
          {getReadOnlyMessage()}
        </div>
      )}
      <div className="editor-container size-full overflow-x-auto bg-white px-4 print:p-0 print:bg-white print:overflow-visible">
        <div className="print:hidden">
          <NotificationBanner
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        </div>
        <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0 print:flex-none print:block">
          <EditorContent editor={editor} />
          <div className="print:hidden">
            <Threads editor={editor} />
          </div>
        </div>
      </div>
    </>
  );
};
