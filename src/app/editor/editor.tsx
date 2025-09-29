"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";
import "./editor.css";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/utils";
import TaskItem from "@tiptap/extension-task-item";

interface ImageUploadResponse {
  success: boolean;
  image?: {
    url: string;
  };
}
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
import {
  useOthers,
  useSelf,
  useMyPresence,
  useStatus,
} from "@liveblocks/react/suspense";
import { Threads } from "./threads";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { resetAllCircuitBreakers } from "@/lib/utils";

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

  // Helper function to convert HSL to hex for collaborative highlighting
  const hslToHex = (hsl: string): string => {
    try {
      const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!match) return '#3B82F6'; // Default blue
      
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1/3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1/3);
      
      const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return '#3B82F6'; // Default blue on error
    }
  };

interface EditorProps {
  initialContent?: string;
  isEditable?: boolean;
  userType?: "manager" | "member" | "adviser";
  suppressReadOnlyBanner?: boolean;
  documentId?: Id<"documents">; // Add document ID for tracking edits
}

export const Editor = ({
  initialContent,
  isEditable = true,
  userType = "manager",
  suppressReadOnlyBanner = false,
  documentId, // Destructure documentId
}: EditorProps) => {
  const { setEditor } = useEditorStore();
  const { user } = useUser();
  const { addBanner } = useBannerManager();
  const trackEditMutation = useMutation(api.mutations.trackDocumentEdit);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isDataSynced, setIsDataSynced] = useState(true);

  // Get current user's Convex ID
  const currentUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id || "",
  });

  // Get the live document content to compare with Liveblocks
  const liveDocument = useQuery(
    api.fetch.getDocument,
    documentId ? { documentId } : "skip",
  );

  const liveblocks = useLiveblocksExtension({
    initialContent,
    offlineSupport_experimental: false, // Disable offline support to prevent offline editing
  });
  const self = useSelf();
  const others = useOthers();
  const [, setMyPresence] = useMyPresence();
  const status = useStatus();

  // Helper function to show notifications using the new banner system
  const showNotification = useCallback(
    (message: string, type: "error" | "success" | "warning" | "info") => {
      addBanner({
        message,
        type,
        onClose: () => {}, // Banner will auto-close
        autoClose: true,
      });
    },
    [addBanner],
  );

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

  const editor = useEditor({
    immediatelyRender: false,
    editable: isEditable && !isOffline && isDataSynced, // Disable editing when offline, not editable, or data not synced
    onCreate: () => {
      // Mark editor as initialized after creation to prevent false edit tracking
      // Add a small delay to ensure editor is fully ready
      setTimeout(() => {
        setHasInitialized(true);
      }, 100);
    },
    onUpdate: () => {
      // Track document edits for contributor system
      // Only track after the editor has fully initialized to prevent false positives
      // Don't track edits when offline or data not synced
      if (
        isEditable &&
        !isOffline &&
        isDataSynced &&
        self?.info?.name &&
        currentUser?._id &&
        documentId &&
        hasInitialized
      ) {
        // This will be called whenever the document content changes
        // console.log("Document edited by user:", self.info.name); // Removed for security

        trackEditMutation({
          documentId: documentId,
          userId: currentUser._id,
        });
      }
    },
    editorProps: {
      attributes: {
        style:
          "padding-left: 56px; padding-right:56px; font-family: 'Times New Roman', serif; font-size: 11px; line-height: 1.5; text-align: justify;",
        class: `focus:outline-none bg-white border border-[#C7C7C7] print:border-none print:shadow-none print:m-0 print:p-0 flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 ${isEditable && !isOffline && isDataSynced ? "cursor-text" : "cursor-default"} ${isOffline ? "opacity-75" : ""}`,
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
      // Handle keyboard shortcuts and disable key events in view-only mode
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
        } else {
          // Handle table keyboard shortcuts when editable
          const isInTable =
            view.state.selection.$from.node(-1)?.type.name === "table";

          if (isInTable) {
            // Delete table with Ctrl+Shift+Delete
            if (event.ctrlKey && event.shiftKey && event.key === "Delete") {
              event.preventDefault();
              return true; // Let the editor handle this via useEffect
            }
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
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 100,
        View: undefined,
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "table-cell",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "table-header",
        },
      }),
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

  // Function to check if Liveblocks and Convex data are synchronized
  const checkDataSync = useCallback(() => {
    if (!editor || !liveDocument) return true;

    const liveblocksContent = editor.getHTML();
    const convexContent = liveDocument.content;

    // Compare content (normalize whitespace for comparison)
    const normalizedLiveblocks = liveblocksContent.replace(/\s+/g, " ").trim();
    const normalizedConvex = convexContent.replace(/\s+/g, " ").trim();

    // If this user was offline, they should sync with the online users
    // The offline user's content should match the online content
    if (wasOffline) {
      return normalizedLiveblocks === normalizedConvex;
    }

    // For users who were always online, they are considered synced
    return true;
  }, [editor, liveDocument, wasOffline]);

  // Check data synchronization when editor or document changes
  // Only check sync if this user was offline (to prevent affecting other users)
  useEffect(() => {
    if (editor && liveDocument && wasOffline) {
      const synced = checkDataSync();
      setIsDataSynced(synced);

      if (!synced) {
        showNotification(
          "Document data is not synchronized. Please wait for sync to complete before editing.",
          "warning",
        );
      }
    }
  }, [editor, liveDocument, checkDataSync, showNotification, wasOffline]);

  // Offline detection and handling
  useEffect(() => {
    const handleOnline = () => {
      // Reset circuit breakers when coming back online to prevent reconnection issues
      resetAllCircuitBreakers();

      // Update offline state immediately
      setIsOffline(false);
      
      // Force enable editing immediately
      if (editor) {
        editor.setEditable(true);
      }
      
      if (wasOffline) {
        // When reconnecting, replace offline content with online content
        if (editor && liveDocument) {
          const convexContent = liveDocument.content;
          
          // Replace offline content with online content
          editor.commands.setContent(convexContent);
          
          // Force a small delay to ensure content is updated before clearing wasOffline
          setTimeout(() => {
            setWasOffline(false);
            setIsDataSynced(true);
          }, 100);
        }
        
        showNotification(
          "Content synchronized with online version. You can now edit the document.",
          "success",
        );
      } else {
        showNotification(
          "Connection restored! You can now edit the document.",
          "success",
        );
      }
      
      // Force enable editing after a brief delay to ensure state updates
      setTimeout(() => {
        if (editor) {
          editor.setEditable(true);
          // Force trigger a re-render by updating the editor state
          editor.view.dispatch(editor.state.tr);
        }
      }, 50);
      
      // Additional force update after a longer delay
      setTimeout(() => {
        if (editor) {
          editor.setEditable(true);
        }
      }, 200);
      
      // Force clear offline state one more time
      setTimeout(() => {
        setIsOffline(false);
        setIsDataSynced(true);
        if (editor) {
          editor.setEditable(true);
          // Force focus to ensure editor is interactive
          editor.commands.focus();
        }
      }, 500);
      
      // Final attempt to enable editing
      setTimeout(() => {
        if (editor) {
          editor.setEditable(true);
          editor.commands.focus();
        }
      }, 1000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      showNotification(
        "You are offline. You can only view the document until connection is restored.",
        "warning",
      );
    };

    // Check initial connection status
    if (!navigator.onLine) {
      setIsOffline(true);
      setWasOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline, showNotification, checkDataSync, editor, liveDocument]);

  // Enhanced offline detection that considers both browser and Liveblocks status
  useEffect(() => {
    const isLiveblocksDisconnected =
      status === "disconnected" || status === "reconnecting";
    const isActuallyOffline = isOffline || isLiveblocksDisconnected;

    if (isActuallyOffline !== isOffline) {
      setIsOffline(isActuallyOffline);
      if (isActuallyOffline && !wasOffline) {
        setWasOffline(true);
        showNotification(
          "Connection lost. Editing has been disabled until connection is restored.",
          "warning",
        );
      }
    }
  }, [status, isOffline, wasOffline, showNotification]);

  // Prevent content changes when offline by blocking all input events
  useEffect(() => {
    if (!editor) return;

    const handleBeforeInput = (event: Event) => {
      if (isOffline || !isDataSynced) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleInput = (event: Event) => {
      if (isOffline || !isDataSynced) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("beforeinput", handleBeforeInput, true);
    editorElement.addEventListener("input", handleInput, true);

    return () => {
      editorElement.removeEventListener("beforeinput", handleBeforeInput, true);
      editorElement.removeEventListener("input", handleInput, true);
    };
  }, [editor, isOffline, isDataSynced]);

  // Force editor to be non-editable when offline or data not synced
  useEffect(() => {
    if (editor) {
      const shouldBeEditable = isEditable && !isOffline && isDataSynced;
      
      // Only update if the state has actually changed
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    }
  }, [editor, isEditable, isOffline, isDataSynced]);
  
  // Additional effect to force enable editing when coming back online
  useEffect(() => {
    if (editor && !isOffline && isDataSynced && isEditable) {
      // Small delay to ensure all states are properly set
      const timeoutId = setTimeout(() => {
        editor.setEditable(true);
        editor.commands.focus();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, isOffline, isDataSynced, isEditable]);

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
        // Convert color to hex if it's HSL format
        const userColor = self?.info?.color || "#3B82F6";
        const hexColor = userColor.startsWith('hsl(') ? hslToHex(userColor) : userColor;
        
        setMyPresence({
          selection: {
            from,
            to,
            color: hexToRgba(hexColor, 0.15),
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

  // Handle keyboard shortcuts for table operations and list indentation
  useEffect(() => {
    if (!editor || !isEditable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if cursor is in a table
      const isInTable = editor.isActive("table");

      if (isInTable) {
        // Handle Enter key in tables - let it create new lines within cells
        if (event.key === "Enter") {
          // Let the default behavior handle Enter (creates new lines within cells)
          // No custom logic needed - TipTap handles this naturally
        }

        // Handle Tab key for table navigation
        if (event.key === "Tab") {
          const { state } = editor;
          const { selection } = state;
          const { $from } = selection;

          // Find the table node and its position
          let tableNode = null;
          let tablePos = -1;

          // Walk up the node tree to find the table
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === "table") {
              tableNode = node;
              tablePos = $from.before(depth);
              break;
            }
          }

          if (tableNode && tablePos !== -1) {
            // Check if we're at the last cell of the table
            const tableEnd = tablePos + tableNode.nodeSize;
            const isAtLastCell = $from.pos >= tableEnd - 2; // Approximate last cell position

            if (isAtLastCell && !event.shiftKey) {
              // We're at the last cell and pressing Tab (not Shift+Tab), exit table
              event.preventDefault();
              editor
                .chain()
                .focus()
                .insertContentAt(tableEnd, { type: "paragraph" })
                .run();
              return;
            }

            if ($from.pos <= tablePos + 2 && event.shiftKey) {
              // We're at the first cell and pressing Shift+Tab, exit table
              event.preventDefault();
              editor
                .chain()
                .focus()
                .insertContentAt(tablePos, { type: "paragraph" })
                .run();
              return;
            }
          }
        }

        // Handle Arrow keys for better table navigation (ONLY in tables)
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const { state } = editor;
          const { selection } = state;
          const { $from } = selection;

          // Find the table node and its position
          let tableNode = null;
          let tablePos = -1;

          // Walk up the node tree to find the table
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === "table") {
              tableNode = node;
              tablePos = $from.before(depth);
              break;
            }
          }

          if (tableNode && tablePos !== -1) {
            if (event.key === "ArrowDown") {
              // Check if we're at the bottom of the table
              const tableEnd = tablePos + tableNode.nodeSize;

              if ($from.pos >= tableEnd - 1) {
                // We're at the bottom of the table, exit and create new paragraph
                event.preventDefault();
                editor
                  .chain()
                  .focus()
                  .insertContentAt(tableEnd, { type: "paragraph" })
                  .setTextSelection(tableEnd + 1) // Set cursor position correctly
                  .run();
                return;
              }
            }

            if (event.key === "ArrowUp") {
              // Check if we're at the top of the table
              if ($from.pos <= tablePos + 1) {
                // We're at the top of the table, exit and create paragraph before
                event.preventDefault();
                editor
                  .chain()
                  .focus()
                  .insertContentAt(tablePos, { type: "paragraph" })
                  .setTextSelection(tablePos + 1) // Set cursor position correctly
                  .run();
                return;
              }
            }
          }
        }

        // Delete table with Ctrl+Shift+Delete
        if (event.ctrlKey && event.shiftKey && event.key === "Delete") {
          event.preventDefault();
          editor.chain().focus().deleteTable().run();
        }

        // Merge cells with Ctrl+Shift+M
        if (event.ctrlKey && event.shiftKey && event.key === "M") {
          event.preventDefault();
          editor.chain().focus().mergeCells().run();
        }

        // Split cell with Ctrl+Shift+S
        if (event.ctrlKey && event.shiftKey && event.key === "S") {
          event.preventDefault();
          editor.chain().focus().splitCell().run();
        }
      }

      // Handle Tab key for list indentation (only when not in table)
      if (event.key === "Tab" && !isInTable) {
        const isInList =
          editor.isActive("bulletList") || editor.isActive("orderedList");

        if (isInList) {
          event.preventDefault();

          if (event.shiftKey) {
            // Shift+Tab: Outdent list item
            editor.chain().focus().liftListItem("listItem").run();
          } else {
            // Tab: Indent list item
            editor.chain().focus().sinkListItem("listItem").run();
          }
        }
      }

      // For all other cases (including arrow keys outside tables), let TipTap handle naturally
      // This ensures proper navigation through images, paragraphs, etc.
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, isEditable]);

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
      {isOffline && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-2 text-sm text-center w-full">
          You are offline. Editing has been disabled until connection is
          restored.
        </div>
      )}
      {!isDataSynced && !isOffline && wasOffline && (
        <div className="bg-orange-100 border border-orange-400 text-orange-800 px-4 py-2 text-sm text-center w-full">
          Document data is not synchronized. Please wait for sync to complete
          before editing.
        </div>
      )}
      <div className="editor-container size-full overflow-x-auto bg-gray-50 px-4 print:p-0 print:bg-white print:overflow-visible">
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
