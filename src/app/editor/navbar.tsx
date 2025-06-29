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
    MenubarTrigger
} from "@/components/ui/menubar"

import { BoldIcon, FileIcon, FileJsonIcon, FilePlusIcon, FileTextIcon, GlobeIcon, ItalicIcon, PrinterIcon, Redo2Icon, RemoveFormattingIcon, StrikethroughIcon, TextIcon, UnderlineIcon, Undo2Icon, DownloadIcon } from "lucide-react";
import { BsFilePdf, BsFiletypeDocx } from "react-icons/bs";
import { useEditorStore } from "@/store/use-editor-store";

interface NavbarProps {
    title?: string;
    viewOnly?: boolean;
}

export const Navbar = ({ title = "Untitled Document", viewOnly = false }: NavbarProps) => {
    const [selectedRows, setSelectedRows] = useState(1); 
    const [selectedCols, setSelectedCols] = useState(1);
    const { editor } = useEditorStore();
    const router = useRouter();

    const createTable = (rows: number, cols: number) => {
        if (viewOnly) return;
        editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false}).run()
    };

    const onDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
    }

    const onSavePDF = async () => {
        if (!editor) return;
        
        try {
            // Dynamic import for client-side only
            const jsPDF = (await import('jspdf')).default;
            const html2canvas = (await import('html2canvas')).default;
            
            const content = editor.view.dom;
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save('Document.pdf');
        } catch {
            // Fallback to print
            window.print();
        }
    };

    const onSaveDOCX = async () => {
        if (!editor) return;
        
            // Using the more secure 'docx' library
            const { Document, Packer, Paragraph, TextRun } = await import('docx');
            
            const textContent = editor.getText();
            
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: textContent.split('\n').map(line => 
                        new Paragraph({
                            children: [new TextRun({
                                text: line || ' ',
                                font: 'Times New Roman',
                                size: 22, // 11pt
                            })],
                            alignment: 'both', // Justified
                            spacing: { line: 360 }, // 1.5 line spacing
                        })
                    ),
                }],
            });
            
            const blob = await Packer.toBlob(doc);
            onDownload(blob, 'Document.docx');

    };

    const onSaveJSON = () => {
        if (!editor) return;

        const content = editor.getJSON();
        const blob = new Blob([JSON.stringify(content)], {
            type: "application/json",
        });

        onDownload(blob, `Document.json`)
    }

    const onSaveHTML = () => {
        if (!editor) return;

        const content = editor.getHTML();
        const blob = new Blob([content], {
            type: "text/html",
        });

        onDownload(blob, `Document.html`) 
    }

    const onSaveText = () => {
        if (!editor) return;

        const content = editor.getText();
        const blob = new Blob([content], {
            type: "text/plain",
        });

        onDownload(blob, `Document.txt`) 
    }

    return (
        <nav className="flex items-center justify-between">
            <div className="pl-4 py-1 flex gap-2 items-center">
                <button 
                    onClick={() => router.push('/')} 
                    className="hover:opacity-80 transition-opacity"
                >
                    <Image src="/doctask.ico" alt="DocTask Logo" width={40} height={40}/>
                </button>
                <div className="flex flex-col">
                    <div className="text-lg font-semibold">{title}</div>
                        <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
                            
                            {/* FILE */}
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    File
                                </MenubarTrigger>
                                <MenubarContent className="print:hidden">
                                    <MenubarSub>
                                        <MenubarSubTrigger>
                                            {viewOnly ? (
                                                <>
                                                    <DownloadIcon className="mr-2 size-4" />
                                                    Download
                                                </>
                                            ) : (
                                                <>
                                            <FileIcon className="mr-2 size-4" />
                                            Save
                                                </>
                                            )}
                                        </MenubarSubTrigger>
                                        <MenubarSubContent>
                                            <MenubarItem onClick={onSaveJSON}>
                                                <FileJsonIcon className="mr-2 size-4"/>
                                                JSON
                                            </MenubarItem>
                                            <MenubarItem onClick={onSaveHTML}>
                                                <GlobeIcon className="mr-2 size-4"/>
                                                HTML
                                            </MenubarItem>
                                        <MenubarItem onClick={onSavePDF}>
                                                <BsFilePdf className="mr-2 size-4"/>
                                                PDF
                                            </MenubarItem>
                                        <MenubarItem onClick={onSaveDOCX}>
                                                <BsFiletypeDocx className="mr-2 size-4"/>
                                                Docx
                                            </MenubarItem>
                                            <MenubarItem onClick={onSaveText}>
                                                <FileTextIcon className="mr-2 size-4"/>
                                                Text
                                            </MenubarItem>
                                        </MenubarSubContent>
                                    </MenubarSub>
                                    {/* Only show New Document in edit mode */}
                                    {!viewOnly && (
                                        <>
                                <MenubarItem onClick={() => {}}>
                                        <FilePlusIcon className="mr-2 size-4"/>
                                        New Document
                                    </MenubarItem>
                                    <MenubarSeparator />
                                        </>
                                    )}
                                    {viewOnly && <MenubarSeparator />}
                                    <MenubarItem onClick={() => window.print()}>
                                        <PrinterIcon className="mr-2 size-4"/>
                                        Print <MenubarShortcut>⌘P</MenubarShortcut>
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>

                            {/* EDIT - Only show in edit mode */}
                            {!viewOnly && (
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    Edit
                                </MenubarTrigger>
                                <MenubarContent>
                                    <MenubarItem onClick={() => editor?.chain().focus().undo().run()}>
                                        <Undo2Icon className="mr-2 size-4"/>
                                        Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                                    </MenubarItem>
                                    <MenubarItem onClick={() => editor?.chain().focus().redo().run()}>
                                        <Redo2Icon className="mr-2 size-4"/>
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
                                            <div className="grid grid-cols-10 gap-0.5 w-[200px]">
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
                                                                    row <= selectedRows && col <= selectedCols ? "bg-neutral-300" : "bg-white"
                                                                }`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-2 text-sm text-center">
                                                    {selectedCols} × {selectedRows}
                                                </div>
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
                                            <TextIcon className="mr-2 size-4"/>
                                            Text
                                        </MenubarSubTrigger>
                                        <MenubarSubContent className="min-w-[170px]">
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleBold().run()}>
                                                <BoldIcon className="mr-2 size-4"/>
                                                Bold <MenubarShortcut>⌘B</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleItalic().run()}>
                                                <ItalicIcon className="mr-2 size-4"/>
                                                Italic <MenubarShortcut>⌘I</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                                                <UnderlineIcon className="mr-2 size-4"/>
                                                Underline <MenubarShortcut>⌘U</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleStrike().run()}>
                                                <StrikethroughIcon className="mr-2 size-4"/>
                                                Strikethrough
                                            </MenubarItem>
                                        </MenubarSubContent>
                                    </MenubarSub>
                                    
                                    <MenubarItem onClick={() => editor?.chain().focus().unsetAllMarks().run()}>
                                        <RemoveFormattingIcon className="mr-2 size-4"/>
                                        Clear Formatting 
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                            )}

                        </Menubar>
                    </div>
            </div>
        </nav>
    )
}