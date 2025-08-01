"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

import {
  BoldIcon,
  FileIcon,
  ItalicIcon,
  PrinterIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  TextIcon,
  UnderlineIcon,
  Undo2Icon,
  DownloadIcon,
  HistoryIcon,
  PlusIcon,
} from "lucide-react";
import { BsFilePdf, BsFiletypeDocx } from "react-icons/bs";
import { useEditorStore } from "@/store/use-editor-store";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { CloudSavingIndicator } from "./cloud-saving-indicator";
import { Avatars } from "./avatars";

interface NavbarProps {
  title?: string;
  viewOnly?: boolean;
  userType?: "manager" | "member" | "adviser";
  capstoneTitle?: string;
  onOpenVersionHistory?: () => void;
  backUrl?: string;
  onManualSave?: (isManualSave?: boolean) => Promise<void>;
}

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

export const Navbar = ({
  title = "Untitled Document",
  viewOnly = false,
  userType = "manager",
  capstoneTitle = "",
  onOpenVersionHistory,
  backUrl,
  onManualSave,
}: NavbarProps) => {
  const [selectedRows, setSelectedRows] = useState(1);
  const [selectedCols, setSelectedCols] = useState(1);
  const { editor } = useEditorStore();
  const router = useRouter();
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

  const createTable = (rows: number, cols: number) => {
    if (viewOnly) return;
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: false })
      .run();
  };

  const onDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Helper function to generate consistent filename format
  const generateFilename = (extension: string) => {
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "");
    const sanitizedCapstone = capstoneTitle.replace(/[^a-zA-Z0-9]/g, "");
    return `${sanitizedTitle}-${sanitizedCapstone}-${dateTimeString}.${extension}`;
  };

  const onSavePDF = async () => {
    if (!editor) return;

    try {
      // Dynamic imports
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "816px"; // Letter width (8.5 inches)
      tempContainer.style.minHeight = "1056px"; // Letter height (11 inches)
      tempContainer.style.background = "white";
      tempContainer.style.paddingLeft = "144px"; // 1.5 inches = 144px
      tempContainer.style.paddingRight = "96px"; // 1 inch = 96px
      tempContainer.style.paddingTop = "96px"; // 1 inch = 96px
      tempContainer.style.paddingBottom = "96px"; // 1 inch = 96px
      tempContainer.style.fontFamily = "Times New Roman, serif";
      tempContainer.style.fontSize = "11pt";
      tempContainer.style.lineHeight = "1.5";
      tempContainer.style.color = "black";
      tempContainer.style.boxSizing = "border-box";
      tempContainer.style.textAlign = "justify"; // Match editor text alignment

      // Create a clean version of the editor content
      const cleanContent = document.createElement("div");
      cleanContent.className = "ProseMirror";
      cleanContent.style.border = "none";
      cleanContent.style.outline = "none";
      cleanContent.style.boxShadow = "none";
      cleanContent.style.background = "white";
      cleanContent.style.margin = "0";
      cleanContent.style.padding = "0";
      cleanContent.style.fontFamily = "Times New Roman, serif";
      cleanContent.style.fontSize = "11pt";
      cleanContent.style.lineHeight = "1.5";
      cleanContent.style.width = "100%";

      // Get the editor's HTML content and clean it
      let editorHTML = editor.getHTML();

      // Remove any problematic attributes and classes
      editorHTML = editorHTML
        .replace(/class="[^"]*lb-[^"]*"/g, "")
        .replace(/class="[^"]*liveblocks[^"]*"/g, "")
        .replace(/class="[^"]*cursor[^"]*"/g, "")
        .replace(/class="[^"]*floating[^"]*"/g, "")
        .replace(/data-liveblocks[^=]*="[^"]*"/g, "")
        .replace(/data-thread[^=]*="[^"]*"/g, "")
        .replace(/style="[^"]*position:\s*fixed[^"]*"/g, "")
        .replace(/style="[^"]*position:\s*absolute[^"]*"/g, "");

      cleanContent.innerHTML = editorHTML;

      // Apply print-specific styles to clean up the content
      const printStyles = document.createElement("style");
      printStyles.innerHTML = `
        .temp-pdf-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .temp-pdf-container .ProseMirror {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Times New Roman', serif !important;
          font-size: 11pt !important;
          line-height: 1.5 !important;
        }
        
        .temp-pdf-container p {
          margin: 0 0 6pt 0 !important;
          font-size: 11pt !important;
          line-height: 1.5 !important;
          color: black !important;
        }
        
        .temp-pdf-container h1, .temp-pdf-container h2, .temp-pdf-container h3, 
        .temp-pdf-container h4, .temp-pdf-container h5, .temp-pdf-container h6 {
          margin: 12pt 0 6pt 0 !important;
          font-weight: bold !important;
          color: black !important;
        }
        
        .temp-pdf-container h1 { font-size: 14pt !important; }
        .temp-pdf-container h2 { font-size: 13pt !important; }
        .temp-pdf-container h3 { font-size: 12pt !important; }
        
        .temp-pdf-container img {
          max-width: 100% !important;
          height: auto !important;
          margin: 12pt 0 !important;
          outline: none !important;
          border: none !important;
          display: block !important;
        }
        
        .temp-pdf-container table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 12pt 0 !important;
        }
        
        .temp-pdf-container table td, .temp-pdf-container table th {
          border: 1px solid black !important;
          padding: 6pt 8pt !important;
          font-size: 11pt !important;
        }
        
        /* Hide any remaining unwanted elements - ONLY within the PDF container */
        .temp-pdf-container [class*="lb-"],
        .temp-pdf-container [class*="liveblocks-"],
        .temp-pdf-container [class*="cursor"],
        .temp-pdf-container [class*="floating"],
        .temp-pdf-container [data-liveblocks],
        .temp-pdf-container [data-thread] {
          display: none !important;
        }
      `;

      tempContainer.className = "temp-pdf-container";
      tempContainer.appendChild(cleanContent);

      // Add styles and container to document
      document.head.appendChild(printStyles);
      document.body.appendChild(tempContainer);

      // Wait for fonts and images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Process images to ensure they're properly loaded
      const images = tempContainer.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve(null);
            } else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
              setTimeout(() => resolve(null), 3000); // Timeout after 3s
            }
          });
        }),
      );

      // Capture with html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
        windowWidth: tempContainer.offsetWidth,
        windowHeight: tempContainer.offsetHeight,
      });

      // Clean up
      document.body.removeChild(tempContainer);
      document.head.removeChild(printStyles);

      // Create PDF with proper letter dimensions that accounts for editor's existing margins
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "pt", "letter");

      // Letter size in points: 612 x 792
      const pdfWidth = 612;
      const pdfHeight = 792;

      // Since our editor already has proper margins (1.5" left, 1" right/top/bottom),
      // we don't need additional PDF margins - use the full page area
      const availableWidth = pdfWidth;
      const availableHeight = pdfHeight;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate scaling to fit the page width exactly (since editor is designed for letter width)
      // Editor is 816px wide, letter is 612pt wide, so scale = 612/816 = 0.75
      const ratio = Math.min(
        availableWidth / imgWidth,
        availableHeight / imgHeight,
      );
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // Position at top-left corner (no additional margins needed)
      const x = (pdfWidth - scaledWidth) / 2; // Center horizontally if needed
      const y = 0; // Start at top

      pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight, "", "FAST");

      // Handle multiple pages if content is longer than one page
      let remainingHeight = scaledHeight - availableHeight;
      let currentY = -availableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          x,
          currentY,
          scaledWidth,
          scaledHeight,
          "",
          "FAST",
        );
        remainingHeight -= availableHeight;
        currentY -= availableHeight;
      }

      // Save the PDF
      pdf.save(generateFilename("pdf"));
    } catch {
      // Clean up in case of error
      const tempContainer = document.querySelector(".temp-pdf-container");
      const tempStyles = document.querySelector("style");
      if (tempContainer) document.body.removeChild(tempContainer);
      if (tempStyles && tempStyles.innerHTML.includes("temp-pdf-container")) {
        document.head.removeChild(tempStyles);
      }

      // Fallback to print dialog
      showNotification(
        'PDF generation failed. Opening print dialog as fallback. Please select "Save as PDF" from the print options.',
        "warning",
      );
      onPrint();
    }
  };

  const onSaveDOCX = async () => {
    if (!editor) return;

    // Using the more secure 'docx' library
    const { Document, Packer, Paragraph, TextRun, ImageRun } = await import(
      "docx"
    );

    const htmlContent = editor.getHTML();

    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];

    // Process each child node
    for (const node of Array.from(tempDiv.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Handle plain text
        const text = node.textContent?.trim();
        if (text) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  font: "Times New Roman",
                  size: 22, // 11pt
                }),
              ],
            }),
          );
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;

        if (element.tagName === "IMG") {
          // Handle images
          const img = element as HTMLImageElement;
          if (img.src) {
            try {
              const response = await fetch(img.src);
              if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                children.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: new Uint8Array(arrayBuffer),
                        transformation: {
                          width: 400,
                          height: 300,
                        },
                        type: "png",
                      }),
                    ],
                  }),
                );
              }
            } catch {}
          }
        } else {
          // Handle other elements by extracting their text content
          const text = element.textContent?.trim();
          if (text) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    font: "Times New Roman",
                    size: 22, // 11pt
                  }),
                ],
              }),
            );
          }
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    onDownload(blob, generateFilename("docx"));
  };

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

  return (
    <>
      <div className="print:hidden">
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      </div>

      <nav className="flex items-center justify-between print:hidden">
        <div className="pl-4 py-1 flex gap-3 items-center">
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="hover:opacity-80 transition-opacity"
            title="Go home"
          >
            <Image
              src="/doctask.ico"
              alt="DocTask Logo"
              width={40}
              height={40}
            />
          </button>

          {/* Title and Cloud Saving Indicator */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">{title}</div>
              {!viewOnly && (
                <CloudSavingIndicator onManualSave={onManualSave} />
              )}
            </div>
            <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
              {/* HOME/BACK BUTTON */}
              <button
                onClick={() => router.push(backUrl || "/")}
                className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto text-neutral-600 hover:text-neutral-800 transition-colors duration-150"
                title={backUrl ? "Go back" : "Go home"}
              >
                {backUrl ? "Back" : "Home"}
              </button>

              {/* FILE */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  File
                </MenubarTrigger>
                <MenubarContent className="print:hidden">
                  {/* Manual Save - Only in edit mode */}
                  {!viewOnly && (
                    <MenubarItem onClick={() => onManualSave?.(true)}>
                      <FileIcon className="mr-2 size-4" />
                      Save
                    </MenubarItem>
                  )}

                  {/* Download Options */}
                  <MenubarSub>
                    <MenubarSubTrigger>
                      <DownloadIcon className="mr-2 size-4" />
                      Download
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem onClick={onSaveDOCX}>
                        <BsFiletypeDocx className="mr-2 size-4" />
                        Docx
                      </MenubarItem>
                      <MenubarItem onClick={onSavePDF}>
                        <BsFilePdf className="mr-2 size-4" />
                        PDF
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>

                  <MenubarItem onClick={onPrint}>
                    <PrinterIcon className="mr-2 size-4" />
                    Print <MenubarShortcut>⌘P</MenubarShortcut>
                  </MenubarItem>

                  <MenubarSeparator />

                  {/* Only show Version History for managers */}
                  {!viewOnly && userType === "manager" && (
                    <MenubarItem onClick={onOpenVersionHistory}>
                      <HistoryIcon className="mr-2 size-4" />
                      Version History
                    </MenubarItem>
                  )}
                </MenubarContent>
              </MenubarMenu>

              {/* EDIT - Only show in edit mode */}
              {!viewOnly && (
                <MenubarMenu>
                  <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                    Edit
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem
                      onClick={() => editor?.chain().focus().undo().run()}
                    >
                      <Undo2Icon className="mr-2 size-4" />
                      Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => editor?.chain().focus().redo().run()}
                    >
                      <Redo2Icon className="mr-2 size-4" />
                      Redo <MenubarShortcut>⌘Y</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              )}

              {/* INSERT - Only show in edit mode */}
              {!viewOnly && (
                <MenubarMenu>
                  <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                    Insert
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarSub>
                      <MenubarSubTrigger>Table</MenubarSubTrigger>
                      <MenubarSubContent>
                        {/* 10x10 Table Grid */}
                        <div className="p-2">
                          <div className="grid grid-cols-10 gap-0.5 w-[180px]">
                            {Array.from({ length: 10 * 10 }).map((_, index) => {
                              const row = Math.floor(index / 10) + 1;
                              const col = (index % 10) + 1;
                              return (
                                <div
                                  key={index}
                                  onMouseEnter={() => {
                                    setSelectedRows(row);
                                    setSelectedCols(col);
                                  }}
                                  onClick={() => createTable(row, col)}
                                  className={`w-4 h-4 border border-neutral-400 cursor-pointer ${
                                    row <= selectedRows && col <= selectedCols
                                      ? "bg-neutral-300"
                                      : "bg-white"
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <div className="border-t border-neutral-200 my-2"></div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <label className="text-sm font-medium text-neutral-700">
                                Row:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={selectedRows}
                                onChange={(e) =>
                                  setSelectedRows(parseInt(e.target.value) || 1)
                                }
                                className="w-12 h-6 px-1 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-sm font-medium text-neutral-700">
                                Col:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={selectedCols}
                                onChange={(e) =>
                                  setSelectedCols(parseInt(e.target.value) || 1)
                                }
                                className="w-12 h-6 px-1 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              createTable(selectedRows, selectedCols)
                            }
                            className="w-full mt-2 h-7 flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm transition-colors"
                          >
                            <PlusIcon className="size-3" />
                            Add Table
                          </button>
                        </div>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarContent>
                </MenubarMenu>
              )}

              {/* FORMAT - Only show in edit mode */}
              {!viewOnly && (
                <MenubarMenu>
                  <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                    Format
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        <TextIcon className="mr-2 size-4" />
                        Text
                      </MenubarSubTrigger>
                      <MenubarSubContent className="min-w-[170px]">
                        <MenubarItem
                          onClick={() =>
                            editor?.chain().focus().toggleBold().run()
                          }
                        >
                          <BoldIcon className="mr-2 size-4" />
                          Bold <MenubarShortcut>⌘B</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem
                          onClick={() =>
                            editor?.chain().focus().toggleItalic().run()
                          }
                        >
                          <ItalicIcon className="mr-2 size-4" />
                          Italic <MenubarShortcut>⌘I</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem
                          onClick={() =>
                            editor?.chain().focus().toggleUnderline().run()
                          }
                        >
                          <UnderlineIcon className="mr-2 size-4" />
                          Underline <MenubarShortcut>⌘U</MenubarShortcut>
                        </MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>

                    <MenubarItem
                      onClick={() =>
                        editor?.chain().focus().unsetAllMarks().run()
                      }
                    >
                      <RemoveFormattingIcon className="mr-2 size-4" />
                      Clear Formatting
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              )}
            </Menubar>
          </div>
        </div>

        {/* User avatars on the right side */}
        <div className="pr-4 py-1 flex items-center gap-2">
          <Avatars />
        </div>
      </nav>
    </>
  );
};
