import {
  FaEye,
  FaDownload,
  FaEdit,
  FaPlus,
  FaCheck,
  FaTimes,
  FaStickyNote,
} from "react-icons/fa";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import NotesPopupViewOnly from "./NotesPopupViewOnly";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

interface Document {
  _id: Id<"documents">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  chapter: string;
  title: string;
  content: string;
  status: number;
  last_modified?: number;
}

interface Task {
  _id: Id<"taskAssignments">;
  group_id: Id<"groupsTable">;
  chapter: string;
  section: string;
  title: string;
  task_status: number; // 0 = incomplete, 1 = completed (for member/manager communication)
  assigned_student_ids: Id<"users">[];
  assignedUsers?: Array<{
    _id: Id<"users">;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

interface AdviserObj {
  first_name: string;
  middle_name?: string;
  last_name: string;
  pending?: boolean;
  pendingName?: string;
  onCancel?: () => void;
}

interface LatestDocumentsTableProps {
  documents: Document[];
  status: "loading" | "error" | "idle" | "no_group";
  currentUserId: Id<"users">;
  capstoneTitle?: string;
  grade?: number;
  adviser?: AdviserObj;
  onShowAdviserPopup: () => void;
  isSubmitting: boolean;
  mode: "manager" | "member";
  tasks?: Task[];
  group?: {
    _id: Id<"groupsTable">;
    project_manager_id: Id<"users">;
    member_ids: Id<"users">[];
  };
}

// Grade mapping
const GRADE_MAP: { [key: number]: string } = {
  0: "No Grade",
  1: "Approved",
  2: "Approved With Revisions",
  3: "Disapproved",
  4: "Accepted With Revisions",
  5: "Reoral Defense",
  6: "Not Accepted",
};

// Status color mapping for review_status (instructor/manager review process)
const STATUS_COLORS: { [key: number]: string } = {
  0: "bg-gray-100 text-gray-800", // not_submitted
  1: "bg-yellow-100 text-yellow-800", // in_review
  2: "bg-green-100 text-green-800", // approved
  3: "bg-red-100 text-red-800", // rejected
};

// Status label mapping for review_status
const STATUS_LABELS: { [key: number]: string } = {
  0: "Not Submitted",
  1: "In Review",
  2: "Approved",
  3: "Rejected",
};

// Define the proper chapter order for sorting
const CHAPTER_ORDER = [
  "title_page",
  "acknowledgment",
  "abstract",
  "table_of_contents",
  "chapter_1",
  "chapter_2",
  "chapter_3",
  "chapter_4",
  "chapter_5",
  "references",
  "appendix_a",
  "appendix_b",
  "appendix_c",
  "appendix_d",
  "appendix_e",
  "appendix_f",
  "appendix_g",
  "appendix_h",
  "appendix_i",
];

export const LatestDocumentsTable = ({
  documents,
  status,
  currentUserId,
  capstoneTitle,
  grade,
  adviser,
  onShowAdviserPopup,
  isSubmitting,
  mode,
  tasks = [],
  group,
}: LatestDocumentsTableProps) => {
  const router = useRouter();

  // Add Convex mutations
  const submitDocumentForReview = useMutation(
    api.mutations.submitDocumentForReview,
  );
  const cancelDocumentSubmission = useMutation(
    api.mutations.cancelDocumentSubmission,
  );

  // Add state for status filter
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  // Add state for task status filter
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>("all");

  // Add state for advanced details dropdown
  const [openDetails, setOpenDetails] = useState<"documents" | "tasks" | null>(
    null,
  );

  const [notesPopupOpen, setNotesPopupOpen] = useState(false);
  const [notesPopupDoc, setNotesPopupDoc] = useState<Document | null>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  // Add loading states for submit/cancel
  const [submittingDocument, setSubmittingDocument] = useState<string | null>(
    null,
  );
  const [cancelingSubmission, setCancelingSubmission] = useState<string | null>(
    null,
  );

  // Add loading state for DOCX download
  const [downloadingDocx, setDownloadingDocx] = useState<string | null>(null);

  // Add state for bulk download popup
  const [showBulkDownloadPopup, setShowBulkDownloadPopup] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const handleToggleDetails = (detailType: "documents" | "tasks") => {
    setOpenDetails((prev) => (prev === detailType ? null : detailType));
  };

  // Handle edit document navigation
  const handleEditDocument = async (document: Document) => {
    const path = `/student/${currentUserId}/${mode}/docs/${document._id}`;
    router.push(path);
  };

  // Handle view document navigation (always view-only)
  const handleViewDocument = (document: Document) => {
    const path = `/student/${currentUserId}/${mode}/docs/${document._id}?viewOnly=true`;
    router.push(path);
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: "all", label: "Document Status" },
    { value: "0", label: "Not Submitted" },
    { value: "1", label: "In Review" },
    { value: "2", label: "Approved" },
    { value: "3", label: "Rejected" },
  ];

  const taskStatusOptions = [
    { value: "all", label: "Task Status" },
    { value: "1", label: "Complete" },
    { value: "0", label: "Incomplete" },
  ];

  // Helper to get task status for a document
  const getTaskStatus = (doc: Document) => {
    if (["title_page", "appendix_a", "appendix_d"].includes(doc.chapter))
      return 1;
    const relatedTasks = tasks.filter((task) => task.chapter === doc.chapter);
    if (relatedTasks.length === 0) return 0;
    return relatedTasks.every((task) => task.task_status === 1) ? 1 : 0;
  };

  // Check if document can be submitted (all tasks completed and not already submitted)
  const canSubmitDocument = (doc: Document) => {
    const taskStatus = getTaskStatus(doc);
    return taskStatus === 1 && doc.status === 0; // Tasks completed and document not submitted (approved documents cannot be submitted)
  };

  // Check if document can be cancelled (currently submitted)
  const canCancelSubmission = (doc: Document) => {
    return doc.status === 1; // Currently submitted
  };

  // Check if document can be edited (not submitted, not approved, or rejected)
  const canEditDocument = (doc: Document) => {
    if (viewOnlyDocuments.includes(doc.chapter)) return false;

    // If no group information available, default to false
    if (!group) return false;

    // Project managers can edit documents that are not submitted (0), approved (2), or rejected (3)
    if (group.project_manager_id === currentUserId) {
      return doc.status === 0 || doc.status === 2 || doc.status === 3; // Can edit not submitted, approved, or rejected documents
    }

    // Members need to be assigned to related tasks and document is not submitted, approved, or rejected
    const relatedTasks = tasks.filter((task) => task.chapter === doc.chapter);
    const isAssigned = relatedTasks.some((task) =>
      task.assigned_student_ids.includes(currentUserId),
    );
    return (
      isAssigned && (doc.status === 0 || doc.status === 2 || doc.status === 3)
    ); // Can edit not submitted, approved, or rejected documents
  };

  // Handle submit document for review
  const handleSubmitDocument = async (doc: Document) => {
    try {
      setSubmittingDocument(doc._id);

      await submitDocumentForReview({
        groupId: doc.group_id,
        documentPart: doc.chapter,
        userId: currentUserId as Id<"users">,
      });

      setNotification({
        message: "Document submitted for review successfully!",
        type: "success",
      });
    } catch (error) {
      setNotification({
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit document for review.",
        type: "error",
      });
    } finally {
      setSubmittingDocument(null);
    }
  };

  // Handle cancel document submission
  const handleCancelSubmission = async (doc: Document) => {
    try {
      setCancelingSubmission(doc._id);

      await cancelDocumentSubmission({
        groupId: doc.group_id,
        documentPart: doc.chapter,
        userId: currentUserId as Id<"users">,
      });

      setNotification({
        message: "Document submission cancelled successfully!",
        type: "success",
      });
    } catch (error) {
      setNotification({
        message:
          error instanceof Error
            ? error.message
            : "Failed to cancel document submission.",
        type: "error",
      });
    } finally {
      setCancelingSubmission(null);
    }
  };

  // Helper function to generate consistent filename format
  const generateFilename = (title: string, extension: string) => {
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "");
    const sanitizedCapstone = (capstoneTitle || "").replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    return `${sanitizedTitle}-${sanitizedCapstone}-${dateTimeString}.${extension}`;
  };

  // Helper function to generate bulk filename
  const generateBulkFilename = (extension: string) => {
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const sanitizedCapstone = (capstoneTitle || "Capstone").replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    return `${sanitizedCapstone}-Complete-${dateTimeString}.${extension}`;
  };

  // Bulk download function
  const handleBulkDownload = async (format: "docx" | "pdf") => {
    if (!documents || documents.length === 0) {
      setNotification({
        message: "No documents available for download.",
        type: "error",
      });
      return;
    }

    try {
      setBulkDownloading(true);
      setShowBulkDownloadPopup(false);

      // Sort documents by chapter order
      const sortedDocuments = documents.sort((a, b) => {
        const orderA = CHAPTER_ORDER.indexOf(a.chapter);
        const orderB = CHAPTER_ORDER.indexOf(b.chapter);
        if (orderA === -1 && orderB === -1)
          return a.chapter.localeCompare(b.chapter);
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      });

      // Create zip file
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add individual documents
      for (const doc of sortedDocuments) {
        if (doc.content) {
          if (format === "docx") {
            const docxBlob = await createDocxDocument(doc);
            zip.file(`${doc.title}.docx`, docxBlob);
          } else {
            const pdfBlob = await createPdfDocument(doc);
            zip.file(`${doc.title}.pdf`, pdfBlob);
          }
        }
      }

      // Note: Only individual documents are included in the zip file

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${generateBulkFilename("zip")}`;
      a.click();
      URL.revokeObjectURL(url);

      setNotification({
        message: `All documents downloaded successfully as ${format.toUpperCase()}!`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to download bulk documents:", error);
      setNotification({
        message: "Failed to download documents. Please try again.",
        type: "error",
      });
    } finally {
      setBulkDownloading(false);
    }
  };

  // Helper function to create DOCX document
  const createDocxDocument = async (doc: {
    title: string;
    content: string;
  }) => {
    const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak } =
      await import("docx");

    const htmlContent = doc.content;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];

    // Process each child node
    for (const node of Array.from(tempDiv.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
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

        // Handle page breaks
        if (element.className === "page-break") {
          children.push(new PageBreak());
          continue;
        }

        // Handle document sections (add spacing before new sections)
        if (element.className === "document-section") {
          // Add some spacing before new sections
          children.push(
            new Paragraph({
              spacing: {
                before: 400, // 20pt spacing
              },
            }),
          );
        }

        if (element.tagName === "IMG") {
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
            } catch (error) {
              console.error("Failed to load image:", error);
            }
          }
        } else if (element.tagName === "H1") {
          // Handle headings with proper formatting
          const text = element.textContent?.trim();
          if (text) {
            children.push(
              new Paragraph({
                spacing: {
                  before: 400, // 20pt spacing before heading
                  after: 200, // 10pt spacing after heading
                },
                children: [
                  new TextRun({
                    text: text,
                    font: "Times New Roman",
                    size: 32, // 16pt for headings
                    bold: true,
                  }),
                ],
              }),
            );
          }
        } else {
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

    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    return await Packer.toBlob(docxDoc);
  };

  // Helper function to create PDF document
  const createPdfDocument = async (doc: { title: string; content: string }) => {
    const jsPDF = (await import("jspdf")).default;
    const html2canvas = (await import("html2canvas")).default;

    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "816px";
    tempContainer.style.minHeight = "1056px";
    tempContainer.style.background = "white";
    tempContainer.style.paddingLeft = "144px";
    tempContainer.style.paddingRight = "96px";
    tempContainer.style.paddingTop = "96px";
    tempContainer.style.paddingBottom = "96px";
    tempContainer.style.fontFamily = "Times New Roman, serif";
    tempContainer.style.fontSize = "11pt";
    tempContainer.style.lineHeight = "1.5";
    tempContainer.style.color = "black";
    tempContainer.style.boxSizing = "border-box";
    tempContainer.style.textAlign = "justify";

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

    let editorHTML = doc.content;
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
      
      .temp-pdf-container [class*="lb-"],
      .temp-pdf-container [class*="liveblocks-"],
      .temp-pdf-container [class*="cursor"],
      .temp-pdf-container [class*="floating"],
      .temp-pdf-container [data-liveblocks],
      .temp-pdf-container [data-thread] {
        display: none !important;
      }
      
      /* Page break styles */
      .temp-pdf-container .page-break {
        page-break-before: always !important;
        break-before: page !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
      
      .temp-pdf-container .document-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 20pt !important;
      }
      
      .temp-pdf-container .document-section h1 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        margin-top: 20pt !important;
      }
    `;

    tempContainer.className = "temp-pdf-container";
    tempContainer.appendChild(cleanContent);

    document.head.appendChild(printStyles);
    document.body.appendChild(tempContainer);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const images = tempContainer.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map((img) => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(null);
          } else {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 3000);
          }
        });
      }),
    );

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

    document.body.removeChild(tempContainer);
    document.head.removeChild(printStyles);

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF("p", "pt", "letter");

    const pdfWidth = 612;
    const pdfHeight = 792;
    const availableWidth = pdfWidth;
    const availableHeight = pdfHeight;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const ratio = Math.min(
      availableWidth / imgWidth,
      availableHeight / imgHeight,
    );
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    const x = (pdfWidth - scaledWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight, "", "FAST");

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

    return pdf.output("blob");
  };

  // DOCX download function
  const handleDownloadDocx = async (doc: Document) => {
    if (!doc.content) {
      setNotification({
        message: "Document content is empty.",
        type: "error",
      });
      return;
    }

    try {
      setDownloadingDocx(doc._id);

      // Using the more secure 'docx' library
      const { Document, Packer, Paragraph, TextRun, ImageRun } = await import(
        "docx"
      );

      const htmlContent = doc.content;

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
              } catch (error) {
                console.error("Failed to load image:", error);
              }
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

      const docxDoc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      const blob = await Packer.toBlob(docxDoc);

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateFilename(doc.title, "docx");
      a.click();
      URL.revokeObjectURL(url);

      setNotification({
        message: "Document downloaded successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to download DOCX:", error);
      setNotification({
        message: "Failed to download document. Please try again.",
        type: "error",
      });
    } finally {
      setDownloadingDocx(null);
    }
  };

  // Documents that are view/download only
  const viewOnlyDocuments = ["title_page", "appendix_a", "appendix_d"];

  const displayCapstoneTitle =
    capstoneTitle && capstoneTitle.trim() !== ""
      ? capstoneTitle
      : "Untitled Capstone Title";

  // Filter and sort documents
  const filteredDocuments = documents
    .filter((doc) => {
      // Filter by status if selected
      if (selectedStatus !== "all" && doc.status !== parseInt(selectedStatus)) {
        return false;
      }

      // Filter by task status if selected
      if (selectedTaskStatus !== "all") {
        const taskStatus = getTaskStatus(doc);
        if (taskStatus !== parseInt(selectedTaskStatus)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by chapter order first
      const orderA = CHAPTER_ORDER.indexOf(a.chapter);
      const orderB = CHAPTER_ORDER.indexOf(b.chapter);

      // If both chapters are in the order list, sort by their position
      if (orderA !== -1 && orderB !== -1) {
        return orderA - orderB;
      }

      // If only one is in the order list, prioritize it
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;

      // If neither is in the order list, sort alphabetically
      return a.chapter.localeCompare(b.chapter);
    });

  // Format last modified time
  const formatLastModified = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  // --- Progress Bar Logic ---
  const totalDocuments = documents.length;
  const statusCounts = {
    approved: documents.filter((d) => d.status === 2).length,
    rejected: documents.filter((d) => d.status === 3).length,
    in_review: documents.filter((d) => d.status === 1).length,
    not_submitted: documents.filter((d) => d.status === 0).length,
  };

  const progress = {
    approved:
      totalDocuments > 0 ? (statusCounts.approved / totalDocuments) * 100 : 0,
    rejected:
      totalDocuments > 0 ? (statusCounts.rejected / totalDocuments) * 100 : 0,
    in_review:
      totalDocuments > 0 ? (statusCounts.in_review / totalDocuments) * 100 : 0,
    not_submitted:
      totalDocuments > 0
        ? (statusCounts.not_submitted / totalDocuments) * 100
        : 0,
  };

  const taskProgress = {
    completed: tasks.filter((task) => task.task_status === 1).length,
    total: tasks.length,
    percentage:
      tasks.length > 0
        ? (tasks.filter((task) => task.task_status === 1).length /
            tasks.length) *
          100
        : 0,
  };

  return (
    <div>
      {/* Merged Capstone/Adviser/Progress Container */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-100">
        {status === "loading" ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="flex items-center justify-between mb-4 mt-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="flex items-center gap-4">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-9 w-9 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-5" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full"></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ) : status === "no_group" ? (
          <div className="text-center text-red-500 py-8">
            You are not currently assigned to a group. Please contact your
            instructor to be assigned to a group.
          </div>
        ) : (
          <>
            {/* Capstone Title, Adviser, and Grade */}
            <div className="mb-1">
              <h2 className="text-2xl font-bold text-gray-900 break-words max-w-3xl tracking-tight">
                {displayCapstoneTitle}
              </h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(() => {
                  let adviserUI = null;
                  if (mode === "manager") {
                    if (adviser?.pending && adviser.pendingName) {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser: Pending Approval from {adviser.pendingName}
                          </span>
                          <button
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adviser.onCancel && adviser.onCancel()
                            }
                            disabled={isSubmitting}
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    } else if (adviser && adviser.first_name) {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: {adviser.first_name}{" "}
                          {adviser.middle_name ? adviser.middle_name + " " : ""}
                          {adviser.last_name}
                        </span>
                      );
                    } else {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser:
                          </span>
                          <button
                            className="px-2.5 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                            onClick={onShowAdviserPopup}
                            disabled={isSubmitting}
                          >
                            <FaPlus className="w-3 h-3" /> Enter adviser code
                          </button>
                        </div>
                      );
                    }
                  } else if (mode === "member") {
                    if (adviser?.pending && adviser.pendingName) {
                      adviserUI = (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Adviser: Pending Approval from {adviser.pendingName}
                          </span>
                        </div>
                      );
                    } else if (adviser && adviser.first_name) {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: {adviser.first_name}{" "}
                          {adviser.middle_name ? adviser.middle_name + " " : ""}
                          {adviser.last_name}
                        </span>
                      );
                    } else {
                      adviserUI = (
                        <span className="text-sm text-gray-600">
                          Adviser: None
                        </span>
                      );
                    }
                  }
                  return adviserUI;
                })()}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-normal text-gray-700 bg-transparent">
                  Grade: {GRADE_MAP[grade ?? 0] || "No Grade"}
                </span>
                <button
                  className="text-gray-600 hover:text-gray-800 transition-colors p-2 border border-gray-200 rounded-full shadow-sm bg-white"
                  title="Download all documents"
                  onClick={() => setShowBulkDownloadPopup(true)}
                  disabled={bulkDownloading}
                >
                  {bulkDownloading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaDownload className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 mb-5" />

            {/* Combined Progress Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {/* Documentation Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Documentation Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {statusCounts.approved} / {totalDocuments} Approved
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                  <div
                    className="bg-green-500 h-3 transition-all duration-300"
                    style={{ width: `${progress.approved}%` }}
                  ></div>
                  <div
                    className="bg-red-500 h-3 transition-all duration-300"
                    style={{ width: `${progress.rejected}%` }}
                  ></div>
                  <div
                    className="bg-yellow-400 h-3 transition-all duration-300"
                    style={{ width: `${progress.in_review}%` }}
                  ></div>
                  <div
                    className="bg-gray-300 h-3 transition-all duration-300"
                    style={{ width: `${progress.not_submitted}%` }}
                  ></div>
                </div>
                <div className="mt-2 flex justify-between items-end">
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Approved
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Rejected
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                      In Review
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                      Not Submitted
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleDetails("documents")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {openDetails === "documents"
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                </div>
              </div>

              {/* Tasks Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Tasks Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {taskProgress.completed} / {taskProgress.total} Completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${taskProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleToggleDetails("tasks")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {openDetails === "tasks" ? "Hide Details" : "Show Details"}
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Details for Documents */}
            {openDetails === "documents" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-4">
                  Documentation Stats
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800">
                      Approved
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {statusCounts.approved}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statusCounts.rejected}
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">
                      In Review
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {statusCounts.in_review}
                    </p>
                  </div>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">
                      Not Submitted
                    </p>
                    <p className="text-2xl font-bold text-gray-600">
                      {statusCounts.not_submitted}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Details for Tasks */}
            {openDetails === "tasks" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-4">
                  Tasks Stats
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Completed
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {taskProgress.completed}
                        </p>
                      </div>
                      <div className="bg-green-100 p-2 rounded-full">
                        <FaCheck className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Incomplete
                        </p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {tasks.length - taskProgress.completed}
                        </p>
                      </div>
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <FaTimes className="w-4 h-4 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-gray-800 mb-4 mt-6">
                  Task Progress by Chapter
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CHAPTER_ORDER.map((chapter) => {
                    const chapterTasks = tasks.filter(
                      (task) => task.chapter === chapter,
                    );
                    if (chapterTasks.length === 0) return null;
                    const completedTasks = chapterTasks.filter(
                      (task) => task.task_status === 1,
                    ).length;
                    const totalTasks = chapterTasks.length;
                    const progressPercentage =
                      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    return (
                      <div key={chapter} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {chapter.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {completedTasks}/{totalTasks}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ease-in-out ${
                              progressPercentage === 100
                                ? "bg-green-500"
                                : progressPercentage > 50
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* End Merged Container */}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Document
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider relative"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <select
                        className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider relative"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <select
                        className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                        value={selectedTaskStatus}
                        onChange={(e) => setSelectedTaskStatus(e.target.value)}
                      >
                        {taskStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Last Modified
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 min-h-[80px]">
                {status === "loading" && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 pt-7 pb-1 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                )}
                {status === "no_group" && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 pt-7 pb-1 text-center text-red-500"
                    >
                      You are not currently assigned to a group. Please contact
                      your instructor to be assigned to a group.
                    </td>
                  </tr>
                )}
                {status === "error" && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 pt-7 pb-1 text-center text-red-500"
                    >
                      An error occurred while loading documents. Please try
                      again.
                    </td>
                  </tr>
                )}
                {status === "idle" &&
                  Array.isArray(documents) &&
                  documents.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No documents available.
                      </td>
                    </tr>
                  )}
                {status === "idle" &&
                  Array.isArray(documents) &&
                  documents.length > 0 &&
                  filteredDocuments.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 pt-7 pb-1 text-center text-gray-500"
                      >
                        No documents found.
                      </td>
                    </tr>
                  )}
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc._id}
                    className="hover:bg-gray-100 transition-colors duration-150 ease-in-out cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {doc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[doc.status] || STATUS_COLORS[0]}`}
                      >
                        {STATUS_LABELS[doc.status] || STATUS_LABELS[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTaskStatus(doc) === 1 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {getTaskStatus(doc) === 1 ? "Complete" : "Incomplete"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {formatLastModified(doc.last_modified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Document"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        {canEditDocument(doc) && (
                          <button
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Edit Document"
                            onClick={() => handleEditDocument(doc)}
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Download Document"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDocx(doc);
                          }}
                          disabled={downloadingDocx === doc._id}
                        >
                          {downloadingDocx === doc._id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FaDownload className="w-4 h-4" />
                          )}
                        </button>
                        {/* Only show Notes and Submit for non-excluded chapters */}
                        {!["title_page", "appendix_a", "appendix_d"].includes(
                          doc.chapter,
                        ) && (
                          <>
                            <span className="mx-2 text-gray-300 select-none">
                              |
                            </span>
                            <button
                              className="text-yellow-500 hover:text-yellow-600 transition-colors"
                              title="View Notes"
                              onClick={() => {
                                setNotesPopupDoc(doc);
                                setNotesPopupOpen(true);
                              }}
                            >
                              <FaStickyNote className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* Submit/Cancel button for project managers */}
                        {group &&
                          group.project_manager_id === currentUserId &&
                          !["title_page", "appendix_a", "appendix_d"].includes(
                            doc.chapter,
                          ) &&
                          doc.status !== 3 && // Hide for rejected documents
                          (canSubmitDocument(doc) ||
                            canCancelSubmission(doc)) && (
                            <>
                              <button
                                className={`transition-colors ${
                                  canCancelSubmission(doc)
                                    ? "text-red-600 hover:text-red-800"
                                    : "text-green-600 hover:text-green-800"
                                }`}
                                title={
                                  canCancelSubmission(doc)
                                    ? "Cancel Submission"
                                    : "Submit Document"
                                }
                                onClick={() => {
                                  if (canSubmitDocument(doc)) {
                                    handleSubmitDocument(doc);
                                  } else if (canCancelSubmission(doc)) {
                                    handleCancelSubmission(doc);
                                  }
                                }}
                                disabled={
                                  submittingDocument === doc._id ||
                                  cancelingSubmission === doc._id
                                }
                              >
                                {submittingDocument === doc._id ||
                                cancelingSubmission === doc._id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : canCancelSubmission(doc) ? (
                                  <FaTimes className="w-4 h-4" />
                                ) : (
                                  <FaCheck className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {notesPopupOpen && notesPopupDoc && (
        <NotesPopupViewOnly
          isOpen={notesPopupOpen}
          onClose={() => setNotesPopupOpen(false)}
          groupId={notesPopupDoc.group_id}
          documentPart={notesPopupDoc.chapter}
          documentTitle={notesPopupDoc.title}
        />
      )}

      {notification && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Bulk Download Popup */}
      {showBulkDownloadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Download All Documents
              </h3>
              <button
                onClick={() => setShowBulkDownloadPopup(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={bulkDownloading}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Choose a format to download all documents. The zip file will
              contain individual documents as separate files.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleBulkDownload("docx")}
                disabled={bulkDownloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkDownloading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaDownload className="w-4 h-4" />
                )}
                Download as DOCX
              </button>

              <button
                onClick={() => handleBulkDownload("pdf")}
                disabled={bulkDownloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkDownloading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaDownload className="w-4 h-4" />
                )}
                Download as PDF
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>• Individual documents will be included as separate files</p>
              <p>• All files will be packaged in a zip archive</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
