"use client";

import React, { useEffect, useState } from "react";
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon, BoldIcon, ChevronDownIcon, HighlighterIcon, ImageIcon, ItalicIcon, Link2Icon, ListCollapseIcon, ListIcon, ListOrderedIcon, ListTodoIcon, LucideIcon, MessageSquarePlusIcon, MinusIcon, PlusIcon, PrinterIcon, Redo2Icon, RemoveFormattingIcon, SearchIcon, SpellCheckIcon, UnderlineIcon, Undo2Icon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Level } from "@tiptap/extension-heading";
import { type ColorResult, CompactPicker } from "react-color";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/use-editor-store";

const FontFamilyButton = () => {
    const { editor } = useEditorStore();
    const [currentFont, setCurrentFont] = useState("Times New Roman");

    useEffect(() => {
        if (!editor) return;

        const updateFontFamily = () => {
            setCurrentFont(editor.getAttributes("textStyle").fontFamily || "Times New Roman");
        };

        editor.on("selectionUpdate", updateFontFamily);
        
        return () => {
            editor.off("selectionUpdate", updateFontFamily);
        };
    }, [editor]);

    const fonts = [
        { label: "Times New Roman", value: "Times New Roman" },
        { label: "Arial", value: "Arial" },
        { label: "Courier New", value: "Courier New" },
        { label: "Georgia", value: "Georgia" },
        { label: "Verdana", value: "Verdana" },
    ];

    const handleFontChange = (value: string) => {
        editor?.chain().focus().setFontFamily(value).run();
        setCurrentFont(value); 
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-7 w-[120px] shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <span className="truncate">{currentFont}</span>
                    <ChevronDownIcon className="ml-2 size-4 shrink-0"/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p=1 flex flex-col gap-y-1">
                {fonts.map(({ label, value }) => (
                    <button 
                        onClick={() => handleFontChange(value)}
                        key={value} 
                        className={cn(
                            "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
                            currentFont === value && "bg-neutral-200/80"
                        )}
                        style={{ fontFamily: value }}
                    >
                        <span className="text-sm">{label}</span>
                    </button>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
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
            editor.chain().focus().toggleHeading({ level: value as Level }).setBold().run(); // Ensure H1 and H2 are bolded
            setCurrentHeading(`Heading ${value}`);
        } else {
            editor.chain().focus().toggleHeading({ level: value as Level }).unsetBold().run(); // Ensure H3-H5 are not bolded
            setCurrentHeading(`Heading ${value}`);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <span className="truncate">{currentHeading}</span>
                    <ChevronDownIcon className="ml-2 size-4 shrink-0"/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-1 flex flex-col gap-y-1">
                {headings.map(({ label, value, fontSize }) => (
                    <button 
                        key={value}
                        style={{ fontSize, fontWeight: value === 1 || value === 2 ? "bold" : "normal" }} // Ensure H1 & H2 are bold in dropdown
                        onClick={() => handleHeadingChange(value)}
                        className={cn(
                            "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
                            currentHeading === label && "bg-neutral-200/80"
                        )}
                    >
                        {label}
                    </button>                
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const TextColorButton = () => {
    const { editor } = useEditorStore();
    const [currentColor, setCurrentColor] = useState("#000000");

    useEffect(() => {
        if (!editor) return;

        const updateTextColor = () => {
            setCurrentColor(editor.getAttributes("textStyle").color || "#000000");
        };

        editor.on("selectionUpdate", updateTextColor);

        return () => {
            editor.off("selectionUpdate", updateTextColor);
        };
    }, [editor]);

    const onChange = (color: ColorResult) => {
        editor?.chain().focus().setColor(color.hex).run();
        setCurrentColor(color.hex);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <span className="text-sx font-semibold">A</span>
                    <div className="w-4 h-0.5 rounded-sm" style={{ backgroundColor: currentColor }} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0">
                <CompactPicker color={currentColor} onChange={onChange} />
            </DropdownMenuContent>
        </DropdownMenu>
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <HighlighterIcon className="mt-0.5 size-4"/>
                    <div className="w-4 h-0.5 mt-0.5 rounded-sm" style={{ backgroundColor: highlightColor }} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0">
                <CompactPicker color={highlightColor} onChange={onChange} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const LinkButton = () => {
    const { editor } = useEditorStore();
    const [value, setValue] = useState(editor?.getAttributes("link").href || "")

    const onChange = (href: string) => {
        editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
        setValue("");
    };

    return (
        <DropdownMenu onOpenChange={(open) => {
            if (open) {
                setValue(editor?.getAttributes("link").href || "");
            }
        }}>
            <DropdownMenuTrigger asChild>
                <button className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <Link2Icon className="mt-0.5 size-4"/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2.5 flex items-center gap-x-2">
                <Input 
                    placeholder="https://example.com"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <Button onClick={() => onChange(value)}>
                    Apply
                </Button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ImageButton = () => {
    const { editor } = useEditorStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const onChange = (src: string) => {
        editor?.chain().focus().setImage({ src }).run();
    };

    const onUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const imageUrl = URL.createObjectURL(file);
                onChange(imageUrl);
            }
        }

        input.click();
    }

    const handleImageUrlSubmit = () => {
        if (imageUrl) {
            onChange(imageUrl);
            setImageUrl("");
            setIsDialogOpen(false);
        }
    }
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                        <ImageIcon className="mt-0.5 size-4"/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={onUpload}>
                        <UploadIcon className="size-4 mr-2" />
                        Upload
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                        <SearchIcon className="size-4 mr-2" />
                        Paste image url
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                                handleImageUrlSubmit()
                            }
                        }}
                        
                    />
                    <DialogFooter>
                        <Button onClick={(handleImageUrlSubmit)}>
                            Insert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ALIGNMENT */
interface AlignButtonProps {
    alignment: "left" | "center" | "right" | "justify";
    icon: LucideIcon;
    activeAlignment: string;
    setActiveAlignment: (alignment: string) => void;
}

const AlignButton: React.FC<AlignButtonProps> = ({ alignment, icon: Icon, activeAlignment, setActiveAlignment }) => {
    const { editor } = useEditorStore();
    const isActive = activeAlignment === alignment;

    const handleClick = () => {
        editor?.chain().focus().setTextAlign(alignment).run();
        setActiveAlignment(alignment);
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
                isActive && "bg-neutral-300"
            )}
        >
            <Icon className="size-4" />
        </button>
    );
};

const AlignmentButtons: React.FC = () => {
    const { editor } = useEditorStore();
    const [activeAlignment, setActiveAlignment] = useState<string>("");

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
            } else {
                setActiveAlignment("left");
            }
        };

        editor.on("selectionUpdate", updateState);

        return () => {
            editor.off("selectionUpdate", updateState);
        };
    }, [editor]);

    return (
        <>
            <AlignButton alignment="left" icon={AlignLeftIcon} activeAlignment={activeAlignment} setActiveAlignment={setActiveAlignment} />
            <AlignButton alignment="center" icon={AlignCenterIcon} activeAlignment={activeAlignment} setActiveAlignment={setActiveAlignment} />
            <AlignButton alignment="right" icon={AlignRightIcon} activeAlignment={activeAlignment} setActiveAlignment={setActiveAlignment} />
            <AlignButton alignment="justify" icon={AlignJustifyIcon} activeAlignment={activeAlignment} setActiveAlignment={setActiveAlignment} />
        </>
    );
};

/* LISTS */
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
        <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={cn(
                "h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
                isActive && "bg-neutral-300"
            )}
        >
            <ListIcon className="mt-0.5 size-4" />
        </button>
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
        <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={cn(
                "h-7 min-w-7 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
                isActive && "bg-neutral-300"
            )}
        >
            <ListOrderedIcon className="mt-0.5 size-4" />
        </button>
    );
};

const FontSizeButton = () => {
    const { editor } = useEditorStore();

    // Get the current font size from the editor's selection
    const currentFontSize = editor?.getAttributes("textStyle").fontSize
        ? editor?.getAttributes("textStyle").fontSize.replace("px", "")
        : "11";

    const [fontSize, setFontSize] = useState(currentFontSize);
    const [inputValue, setInputValue] = useState(fontSize);
    const [isEditing, setIsEditing] = useState(false);

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
    
            // If not a heading, get the font size from textStyle
            if (newSize === "11") {
                newSize = editor.getAttributes("textStyle").fontSize?.replace("px", "") || "11";
            }
    
            setFontSize(newSize);
            setInputValue(newSize);
        };
    
        editor.on("selectionUpdate", updateFontSizeFromSelection);
        editor.on("transaction", updateFontSizeFromSelection); // ✅ Updates immediately on change
    
        return () => {
            editor.off("selectionUpdate", updateFontSizeFromSelection);
            editor.off("transaction", updateFontSizeFromSelection); // Cleanup event listeners
        };
    }, [editor]);
     

    const updateFontSize = (newSize: string) => {
        const size = parseInt(newSize);
        if (!isNaN(size) && size > 0) {
            editor?.chain().focus().setFontSize(`${size}px`).run();
            setFontSize(newSize);
            setInputValue(newSize);
            setIsEditing(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        updateFontSize(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            updateFontSize(inputValue);
            editor?.commands.focus();
        }
    };

    const increment = () => {
        const newSize = parseInt(fontSize) + 1;
        if (newSize > 0) {
            updateFontSize(newSize.toString());
        }
    };

    const decrement = () => {
        const newSize = parseInt(fontSize) - 1;
        if (newSize > 0) {
            updateFontSize(newSize.toString());
        }
    };

    return (
        <div className="flex items-center gap-x-0.5">
            <button onClick={decrement} className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80">
                <MinusIcon className="size-4" />
            </button>
            {isEditing ? (
                <input 
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-10 text-sm border border-neutral-400 text-center rounded-sm bg-transparent focus-outline-none focus:ring-0"
                />
            ) : (
                <button 
                    onClick={() => {
                        setIsEditing(true);
                        setFontSize(currentFontSize);
                    }}
                    className="h-7 w-10 text-sm border border-neutral-400 text-center rounded-sm bg-transparent cursor-text"
                >
                    {fontSize}
                </button>
            )}

            <button onClick={increment} className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80">
                <PlusIcon className="size-4" />
            </button>
        </div>
    );
};

const LineHeightButton = () => {
    const { editor } = useEditorStore();

    const lineHeights = [
        { label: "Default", value: "normal"},
        { label: "Single", value: "1"},
        { label: "1.15", value: "1.15"},
        { label: "1.5", value: "1.5"},
        { label: "Double", value: "2"},
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm">
                    <ListCollapseIcon className="mt-0.5 size-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-1 flex flex-col gap-y-1">
                {lineHeights.map(({ label, value }) => (
                    <button 
                        key={value}
                        onClick={() => editor?.chain().focus().setLineHeight(value).run()} 
                        className={cn(
                            "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
                            editor?.getAttributes("paragraph").lineHeight === value && "bg-neutral-200/80"
                        )}
                    >
                        <span className="text-sm">{label}</span>
                    </button>                
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

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
        <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={cn("h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80", 
                isActive && "bg-neutral-300"
            )}
        >
            <BoldIcon className="size-4" />
        </button>
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
        <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={cn("h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80", 
                isActive && "bg-neutral-300"
            )}
        >
            <ItalicIcon className="size-4" />
        </button>
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
        <button
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={cn("h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80", 
                isActive && "bg-neutral-300"
            )}
        >
            <UnderlineIcon className="size-4" />
        </button>
    );
};

interface ToolbarButtonProps {
    onClick?: () => void;
    isActive?: boolean;
    icon: LucideIcon;
}

const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
}: ToolbarButtonProps) => {
    return (
    <button 
        onClick={onClick} 
        className={cn(
            "text-sm h-7 min-w-7 flex items-center justify-center rounder-sm hover:bg-neutral-200/80",
            isActive && "bg-neutral-200/80"
        )}
    > 
        <Icon className="size-4" />
    </button>
    )
}

export const Toolbar = () => {
    const { editor } = useEditorStore();
    
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
                onClick: () => window.print(),
            },
            {
                label: "Spell Check",
                icon: SpellCheckIcon,
                onClick: () => {
                    const current = editor?.view.dom.getAttribute("spellcheck");
                    editor?.view.dom.setAttribute("spellcheck", current === "false" ? "true" : "false")
                },
            },
        ],
        [
            {
                label: "Comment",
                icon: MessageSquarePlusIcon,
                isActive: editor?.isActive("liveblocksCommentMark"),
                onClick: () => {}, //editor?.chain().focus().addPendingComment().run(),
            },
            {
                label: "List Todo",
                icon: ListTodoIcon,
                isActive: editor?.isActive("taskList"),
                onClick: () => editor?.chain().focus().toggleTaskList().run(),
            },
            {
                label: "Remove Formatting",
                icon: RemoveFormattingIcon,
                onClick: () => editor?.chain().focus().unsetAllMarks().run(),
            },
        ]
    ]
    return ( 
        <div className="bg-[#F1F4F9] px-2.5 py-0.5 rounded-[24px] min-h-[40px] flex items-center gap-x-0.5 overflow-x-auto">
            {sections[0].map((item) => (
                <ToolbarButton key={item.label} {...item}/>
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
            <LinkButton />
            <ImageButton />
            <Separator orientation="vertical" className="h-6 bg-neutral-300" />
            <AlignmentButtons />
            <Separator orientation="vertical" className="h-6 bg-neutral-300" />
            <LineHeightButton />          
            <BulletListButton />
            <OrderedListButton />
            <Separator orientation="vertical" className="h-6 bg-neutral-300" />
            {sections[1].map((item) => (
                <ToolbarButton key={item.label} {...item}/>
            ))}
        </div>
    );
};