"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { Room } from "../../../../../../editor/room";
import { useSearchParams } from "next/navigation";
import UnauthorizedAccess from "@/app/(pages)/components/UnauthorizedAccess";

interface AdviserViewDocsPageProps {
  params: Promise<{ adviserId: string; documentId: string }>;
}

const AdviserViewDocsPage = ({ params }: AdviserViewDocsPageProps) => {
  const { adviserId, documentId } = use(params);
  const searchParams = useSearchParams();
  let backUrl = searchParams.get("from");
  if (!backUrl) {
    backUrl = `/adviser/${adviserId}/approval/documents`;
  }

  // Fetch the document
  const document = useQuery(api.fetch.getDocument, {
    documentId: documentId as Id<"documents">,
  });

  // Fetch the group info if document exists
  const group = useQuery(
    api.fetch.getGroupById,
    document?.group_id ? { groupId: document.group_id } : "skip",
  );

  // State to track unauthorized access
  const [unauthorizedReason, setUnauthorizedReason] = useState<
    "deleted" | "version_snapshot" | null
  >(null);

  // Fetch the live document ID for Liveblocks room
  const liveDocumentResult = useQuery(
    api.fetch.getLiveDocumentId,
    document?.group_id && document?.chapter
      ? {
          groupId: document.group_id,
          chapter: document.chapter,
          userId: adviserId as Id<"users">,
        }
      : "skip",
  );

  // Check if current document is a version snapshot (not the live document)
  const isVersionSnapshot =
    document && liveDocumentResult?.documentId
      ? document._id !== liveDocumentResult.documentId
      : false;

  // Block access to non-live or soft-deleted documents
  useEffect(() => {
    if (document && document.isDeleted) {
      // Show unauthorized access screen for soft-deleted documents
      setUnauthorizedReason("deleted");
      return;
    }
    if (isVersionSnapshot && liveDocumentResult?.documentId && document) {
      // Redirect to the live document URL
      const currentUrl = new URL(window.location.href);
      const liveDocumentUrl = currentUrl.pathname.replace(
        document._id,
        liveDocumentResult.documentId,
      );
      window.location.href = liveDocumentUrl;
    }
  }, [isVersionSnapshot, liveDocumentResult, document]);

  // Show unauthorized access screen if needed
  if (unauthorizedReason) {
    return <UnauthorizedAccess reason={unauthorizedReason} />;
  }

  // Loading state
  if (
    document === undefined ||
    group === undefined ||
    liveDocumentResult === undefined
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B54A4A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!document || !group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Document Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The document you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A03A3A] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <Room
      isEditable={true}
      userType="adviser"
      title={document.title}
      capstoneTitle={group.capstone_title}
      groupId={group._id.toString()}
      chapter={document.chapter}
      liveDocumentId={liveDocumentResult?.documentId?.toString()}
      toolbarMode="adviserEdit"
      backUrl={backUrl}
    />
  );
};

export default AdviserViewDocsPage;
