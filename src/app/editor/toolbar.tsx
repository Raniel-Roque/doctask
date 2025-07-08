"use client";

import React, { useEffect, useState } from "react";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ChevronDownIcon,
  HighlighterIcon,
  ImageIcon,
  ItalicIcon,
  ListCollapseIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  LucideIcon,
  MessageSquarePlusIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  SearchIcon,
  SpellCheckIcon,
  UnderlineIcon,
  Undo2Icon,
  Unlink,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Level } from "@tiptap/extension-heading";
import { type ColorResult, CompactPicker } from "react-color";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/use-editor-store";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { Threads } from "./threads";

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

const FontFamilyButton = () => {
  // Display-only button showing Times New Roman (cannot be changed)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="h-7 w-auto shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 text-sm cursor-default whitespace-nowrap">
          <span>Times New Roman</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Font: Times New Roman (Fixed)</p>
      </TooltipContent>
    </Tooltip>
  );
};

const HeadingLevelButton = () => {
  const { editor } = useEditorStore();
  const [currentHeading, setCurrentHeading] = useState("Normal Text");

  const headings = [
    { label: "Normal Text", value: 0, fontSize: "11px" },
    { label: "Heading 1", value: 1, fontSize: "12px" },
    { label: "Heading 2", value: 2, fontSize: "12px" },
    { label: "Heading 3", value: 3, fontSize: "11px" },
    { label: "Heading 4", value: 4, fontSize: "11px" },
    { label: "Heading 5", value: 5, fontSize: "11px" },
  ];

  useEffect(() => {
    if (!editor) return;

    const updateHeading = () => {
      let heading = "Normal Text";
      for (let level = 1; level <= 5; level++) {
        if (editor.isActive("heading", { level })) {
          heading = `Heading ${level}`;
        }
      }
      setCurrentHeading(heading);
    };

    editor.on("selectionUpdate", updateHeading);

    return () => {
      editor.off("selectionUpdate", updateHeading);
    };
  }, [editor]);

  const handleHeadingChange = (value: number) => {
    if (!editor) return;

    if (value === 0) {
      editor.chain().focus().setParagraph().unsetBold().run(); // Normal text (remove heading & bold)
      setCurrentHeading("Normal Text");
    } else if (value === 1 || value === 2) {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: value as Level })
        .setBold()
        .run(); // Ensure H1 and H2 are bolded
      setCurrentHeading(`Heading ${value}`);
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: value as Level })
        .unsetBold()
        .run(); // Ensure H3-H5 are not bolded
      setCurrentHeading(`Heading ${value}`);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
              <span className="truncate">{currentHeading}</span>
              <ChevronDownIcon className="ml-2 size-4 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-1 flex flex-col gap-y-1">
            {headings.map(({ label, value, fontSize }) => (
              <button
                key={value}
                style={{
                  fontSize,
                  fontWeight: value === 1 || value === 2 ? "bold" : "normal",
                }} // Ensure H1 & H2 are bold in dropdown
                onClick={() => handleHeadingChange(value)}
                className={cn(
                  "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
                  currentHeading === label && "bg-neutral-200/80",
                )}
              >
                {label}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>
        <p>Text style and heading levels</p>
      </TooltipContent>
    </Tooltip>
  );
};

const TextColorButton = () => {
  const { editor } = useEditorStore();

  useEffect(() => {
    if (!editor) return;

    const updateTextColor = () => {
      const color = editor.getAttributes("textStyle").color || "#000000";
      // Force color to be black only
      if (color !== "#000000") {
        editor.chain().focus().setColor("#000000").run();
      }
    };

    editor.on("selectionUpdate", updateTextColor);

    return () => {
      editor.off("selectionUpdate", updateTextColor);
    };
  }, [editor]);

  // Always force black color
  const handleClick = () => {
    editor?.chain().focus().setColor("#000000").run();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <span className="text-sx font-semibold">A</span>
          <div className="w-4 h-0.5 rounded-sm bg-black" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Text color (Black only)</p>
      </TooltipContent>
    </Tooltip>
  );
};

const HighlightColorButton = () => {
  const { editor } = useEditorStore();
  const [highlightColor, setHighlightColor] = useState("#FFFFFF");

  useEffect(() => {
    if (!editor) return;

    const updateHighlightColor = () => {
      setHighlightColor(editor.getAttributes("highlight").color || "#FFFFFF");
    };

    editor.on("selectionUpdate", updateHighlightColor);

    return () => {
      editor.off("selectionUpdate", updateHighlightColor);
    };
  }, [editor]);

  const onChange = (color: ColorResult) => {
    editor?.chain().focus().setHighlight({ color: color.hex }).run();
    setHighlightColor(color.hex); // ✅ Update UI immediately
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
              <HighlighterIcon className="mt-0.5 size-4" />
              <div
                className="w-4 h-0.5 mt-0.5 rounded-sm"
                style={{ backgroundColor: highlightColor }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-0">
            <CompactPicker color={highlightColor} onChange={onChange} />
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>
        <p>Highlight text</p>
      </TooltipContent>
    </Tooltip>
  );
};

const UnlinkButton = () => {
  const { editor } = useEditorStore();

  const handleClick = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className="h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5"
        >
          <Unlink className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Remove link</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ImageButton = () => {
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
          return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          showNotification("File too large. Maximum size is 5MB.", "error");
          return;
        }

        if (!sanitizedFileName || sanitizedFileName !== file.name) {
          showNotification(
            "Invalid file name. Please use only letters, numbers, and basic punctuation.",
            "error",
          );
          return;
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
          // Use the shared URL from Convex storage
          onChange(data.image.url);
          showNotification("Image uploaded successfully!", "success");
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error) {
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
      <NotificationBanner
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />
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

interface AlignButtonProps {
  alignment: "left" | "center" | "right" | "justify";
  icon: LucideIcon;
  activeAlignment: string;
  setActiveAlignment: (alignment: string) => void;
}

const AlignButton: React.FC<AlignButtonProps> = ({
  alignment,
  icon: Icon,
  activeAlignment,
  setActiveAlignment,
}) => {
  const { editor } = useEditorStore();

  const handleClick = () => {
    editor?.chain().focus().setTextAlign(alignment).run();
    setActiveAlignment(alignment);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            activeAlignment === alignment && "bg-neutral-300",
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {alignment.charAt(0).toUpperCase() + alignment.slice(1)} alignment
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

const AlignmentButtons: React.FC = () => {
  const { editor } = useEditorStore();
  const [activeAlignment, setActiveAlignment] = useState("justify");

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      if (editor.isActive({ textAlign: "left" })) {
        setActiveAlignment("left");
      } else if (editor.isActive({ textAlign: "center" })) {
        setActiveAlignment("center");
      } else if (editor.isActive({ textAlign: "right" })) {
        setActiveAlignment("right");
      } else if (editor.isActive({ textAlign: "justify" })) {
        setActiveAlignment("justify");
      }
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <>
      <AlignButton
        alignment="left"
        icon={AlignLeftIcon}
        activeAlignment={activeAlignment}
        setActiveAlignment={setActiveAlignment}
      />
      <AlignButton
        alignment="center"
        icon={AlignCenterIcon}
        activeAlignment={activeAlignment}
        setActiveAlignment={setActiveAlignment}
      />
      <AlignButton
        alignment="right"
        icon={AlignRightIcon}
        activeAlignment={activeAlignment}
        setActiveAlignment={setActiveAlignment}
      />
      <AlignButton
        alignment="justify"
        icon={AlignJustifyIcon}
        activeAlignment={activeAlignment}
        setActiveAlignment={setActiveAlignment}
      />
    </>
  );
};

const BulletListButton = () => {
  const { editor } = useEditorStore();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setIsActive(editor.isActive("bulletList"));
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-300",
          )}
        >
          <ListIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Bullet list</p>
      </TooltipContent>
    </Tooltip>
  );
};

const OrderedListButton = () => {
  const { editor } = useEditorStore();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setIsActive(editor.isActive("orderedList"));
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-300",
          )}
        >
          <ListOrderedIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Ordered list</p>
      </TooltipContent>
    </Tooltip>
  );
};

const FontSizeButton = () => {
  const { editor } = useEditorStore();
  const [fontSize, setFontSize] = useState("11");

  useEffect(() => {
    if (!editor) return;

    const updateFontSizeFromSelection = () => {
      let newSize = "11"; // Default font size

      // Check if the selected text is part of a heading
      for (let level = 1; level <= 5; level++) {
        if (editor.isActive("heading", { level })) {
          newSize = level === 1 || level === 2 ? "12" : "11"; // Adjust based on heading levels
          break;
        }
      }

      // If not a heading, get the font size from textStyle but restrict to 11 or 12
      if (newSize === "11") {
        const currentSize =
          editor.getAttributes("textStyle").fontSize?.replace("px", "") || "11";
        // Only allow 11 or 12
        newSize = currentSize === "12" ? "12" : "11";
      }

      setFontSize(newSize);
    };

    editor.on("selectionUpdate", updateFontSizeFromSelection);
    editor.on("transaction", updateFontSizeFromSelection);

    return () => {
      editor.off("selectionUpdate", updateFontSizeFromSelection);
      editor.off("transaction", updateFontSizeFromSelection);
    };
  }, [editor]);

  const updateFontSize = (newSize: string) => {
    // Only allow 11 or 12
    if (newSize === "11" || newSize === "12") {
      editor?.chain().focus().setFontSize(`${newSize}px`).run();
      setFontSize(newSize);
    }
  };

  const increment = () => {
    if (fontSize === "11") {
      updateFontSize("12");
    }
  };

  const decrement = () => {
    if (fontSize === "12") {
      updateFontSize("11");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-x-0.5">
          <button
            onClick={decrement}
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
          >
            <MinusIcon className="size-4" />
          </button>
          <button className="h-7 w-10 text-sm border border-neutral-400 text-center rounded-sm bg-transparent cursor-default">
            {fontSize}
          </button>
          <button
            onClick={increment}
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Font size</p>
      </TooltipContent>
    </Tooltip>
  );
};

const LineHeightButton = () => {
  const { editor } = useEditorStore();

  // Display current line height and apply 1.5 when clicked
  const handleClick = () => {
    editor?.chain().focus().setLineHeight("1.5").run();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className="h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <span className="mr-1">1.5</span>
          <ListCollapseIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Line Height: 1.5 (Fixed)</p>
      </TooltipContent>
    </Tooltip>
  );
};

const BoldButton = () => {
  const { editor } = useEditorStore();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setIsActive(editor.isActive("bold"));
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-300",
          )}
        >
          <BoldIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Bold text</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ItalicButton = () => {
  const { editor } = useEditorStore();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setIsActive(editor.isActive("italic"));
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-300",
          )}
        >
          <ItalicIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Italic text</p>
      </TooltipContent>
    </Tooltip>
  );
};

const UnderlineButton = () => {
  const { editor } = useEditorStore();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      setIsActive(editor.isActive("underline"));
    };

    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-300",
          )}
        >
          <UnderlineIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Underline text</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface ToolbarButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  icon: LucideIcon;
  label: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  icon: Icon,
  label,
}: ToolbarButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "text-sm h-7 min-w-7 flex items-center justify-center rounder-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-200/80",
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface ToolbarProps {
  toolbarMode?: "default" | "adviserViewOnly";
}

export const Toolbar = ({ toolbarMode = "default" }: ToolbarProps) => {
  const { editor } = useEditorStore();

  const onPrint = () => {
    // Add print-specific styles to eliminate headers and footers
    const printStyles = `
      <style>
        @page { margin: 0; size: letter; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; }
          body { margin: 0 !important; padding: 0.5in !important; }
        }
      </style>
    `;

    // Inject styles into head
    const head = document.head || document.getElementsByTagName("head")[0];
    const printStyleElement = document.createElement("style");
    printStyleElement.innerHTML = printStyles.replace(/<\/?style>/g, "");
    head.appendChild(printStyleElement);

    // Trigger print
    window.print();

    // Clean up styles after print
    setTimeout(() => {
      head.removeChild(printStyleElement);
    }, 1000);
  };

  if (toolbarMode === "adviserViewOnly") {
    return (
      <div className="bg-[#F1F4F9] px-2.5 py-0.5 rounded-[24px] min-h-[40px] flex items-center gap-x-2 overflow-x-auto">
        <button
          onClick={onPrint}
          className="h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
        >
          <PrinterIcon className="size-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().addPendingComment().run()}
          className="h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
        >
          <MessageSquarePlusIcon className="size-4" />
        </button>
        <div className="flex items-center ml-2">
          <Threads editor={editor} />
        </div>
      </div>
    );
  }

  const sections: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean;
  }[][] = [
    [
      {
        label: "Undo",
        icon: Undo2Icon,
        onClick: () => editor?.chain().focus().undo().run(),
      },
      {
        label: "Redo",
        icon: Redo2Icon,
        onClick: () => editor?.chain().focus().redo().run(),
      },
      {
        label: "Print",
        icon: PrinterIcon,
        onClick: onPrint,
      },
      {
        label: "Spell Check",
        icon: SpellCheckIcon,
        onClick: () => {
          const current = editor?.view.dom.getAttribute("spellcheck");
          editor?.view.dom.setAttribute(
            "spellcheck",
            current === "false" ? "true" : "false",
          );
        },
      },
    ],
    [
      {
        label: "Comment",
        icon: MessageSquarePlusIcon,
        isActive: editor?.isActive("liveblocksCommentMark"),
        onClick: () => editor?.chain().focus().addPendingComment().run(),
      },
      {
        label: "Task List",
        icon: ListTodoIcon,
        isActive: editor?.isActive("taskList"),
        onClick: () => editor?.chain().focus().toggleTaskList().run(),
      },
      {
        label: "Remove Formatting",
        icon: RemoveFormattingIcon,
        onClick: () => editor?.chain().focus().unsetAllMarks().run(),
      },
    ],
  ];

  return (
    <TooltipProvider>
      <div className="bg-[#F1F4F9] px-2.5 py-0.5 rounded-[24px] min-h-[40px] flex items-center gap-x-0.5 overflow-x-auto">
        {sections[0].map((item) => (
          <ToolbarButton key={item.label} {...item} />
        ))}
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <FontFamilyButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <HeadingLevelButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <FontSizeButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <BoldButton />
        <ItalicButton />
        <UnderlineButton />
        <TextColorButton />
        <HighlightColorButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <UnlinkButton />
        <ImageButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <AlignmentButtons />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        <LineHeightButton />
        <BulletListButton />
        <OrderedListButton />
        <Separator orientation="vertical" className="h-6 bg-neutral-300" />
        {sections[1].map((item) => (
          <ToolbarButton key={item.label} {...item} />
        ))}
      </div>
    </TooltipProvider>
  );
};
