"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";
import "./editor.css";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
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

// Custom hook to handle room presence and trigger external save
const useRoomPresence = (others: readonly unknown[], self: unknown) => {
  const isLastUserInRoom = others.length === 0 && self !== null;
  const hasOtherUsers = others.length > 0;

  useEffect(() => {
    if (isLastUserInRoom) {
      // Dispatch a custom event that can be listened to by parent components
      const saveEvent = new CustomEvent('liveblocks-last-user', { 
        detail: { isLastUser: true } 
      });
      window.dispatchEvent(saveEvent);
    }
  }, [isLastUserInRoom]);

  // Dispatch room activity events for smart auto-save
  useEffect(() => {
    const activityEvent = new CustomEvent('liveblocks-room-activity', {
      detail: { hasOthers: hasOtherUsers }
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
  isEditable?: boolean;
  userType?: 'manager' | 'member';
}

export const Editor = ({ isEditable = true, userType = 'manager' }: EditorProps) => {
  const liveblocks = useLiveblocksExtension();
  const { setEditor } = useEditorStore();
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const self = useSelf();
  
  // Use room presence detection
  useRoomPresence(others, self);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        style: "padding-left: 56px; padding-right:56px; font-family: 'Times New Roman', serif; font-size: 11px; line-height: 1.5; text-align: justify;",
        class:
          "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] print:min-h-0 w-[816px] pt-10 pr-14 pb-10 print:p-0 cursor-text",
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
      Image,
      ResizeImage,
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
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'justify',
      }),
      Underline,
      FontSizeExtension,
      LineHeightExtension.configure({
        types: ["paragraph", "heading"],
        defaultLineHeight: "1.5"
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
      updateMyPresence({ selection: null });
      return;
    }

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      
      // Only update presence if selection is not empty
      if (from !== to) {
        updateMyPresence({
          selection: {
            from,
            to,
            color: myPresence.selection?.color || hexToRgba(self?.info?.color || '#3B82F6', 0.15)
          }
        });
      } else {
        // Clear selection when nothing is selected
        updateMyPresence({ selection: null });
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, updateMyPresence, myPresence.selection?.color, self?.info?.color, isEditable]);

  // Update the collaborative highlighting extension when others change
  useEffect(() => {
    if (editor) {
      const collaborativeHighlightingExtension = editor.extensionManager.extensions.find(
        ext => ext.name === 'collaborativeHighlighting'
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

  const getReadOnlyMessage = () => {
    if (userType === 'member') {
      return "You are viewing this document in read-only mode. You need to be assigned to a related task to edit.";
    }
    return "You are viewing this document in read-only mode.";
  };

  return (
    <div className="editor-container size-full overflow-x-auto bg-[#F9F8FD] px-4 print:p-0 print:bg-white print:overflow-visible">
      {!isEditable && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 text-sm text-center print:hidden">
          {getReadOnlyMessage()}
        </div>
      )}
      <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0">
        <EditorContent editor={editor} />
        <Threads editor={editor} />
      </div>
    </div>
  );
};
