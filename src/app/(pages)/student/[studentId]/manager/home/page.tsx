"use client";

import { use, useState, useRef, useEffect } from "react";
import { Navbar } from "../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { useQuery, useMutation, useConvex } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdviserCodePopup } from "./components/AdviserCodePopup";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import React from "react";
import { CancelAdviserRequestPopup } from "./components/CancelAdviserRequestPopup";
import { LatestDocumentsTable } from "../../components/LatestDocumentsTable";

interface ManagerHomeProps {
  params: Promise<{ studentId: string }>;
}

interface StudentGroup {
  _id: Id<"studentsTable">;
  user_id: Id<"users">;
  group_id: Id<"groupsTable"> | null;
}

const ManagerHomePage = ({ params }: ManagerHomeProps) => {
  const { studentId } = use(params);
  const { addBanner } = useBannerManager();

  // UI State
  const [showAdviserPopup, setShowAdviserPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [pendingAdviserCode, setPendingAdviserCode] = useState<string | null>(
    null,
  );
  const adviserCodeInputRef = useRef<() => void>(() => {});
  const [showCancelPopup, setShowCancelPopup] = useState(false);

  // Convex
  const user = useQuery(api.fetch.getUserById, {
    id: studentId as Id<"users">,
  });
  const studentGroup = useQuery(api.fetch.getStudentGroup, {
    userId: studentId as Id<"users">,
  }) as StudentGroup | null;
  const groupDetails = useQuery(
    api.fetch.getGroupById,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );
  const adviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.adviser_id ? { id: groupDetails.adviser_id } : "skip",
  );
  const latestDocuments = useQuery(
    api.fetch.getDocumentsWithStatus,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );
  const requestedAdviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.requested_adviser
      ? { id: groupDetails.requested_adviser }
      : "skip",
  );
  const taskAssignments = useQuery(
    api.fetch.getTaskAssignments,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );

  // Mutations
  const requestAdviserCode = useMutation(api.mutations.requestAdviserCode);
  const cancelAdviserRequest = useMutation(api.mutations.cancelAdviserRequest);
  const convex = useConvex();

  // Determine loading state
  const isLoading =
    user === undefined ||
    studentGroup === undefined ||
    (studentGroup?.group_id && groupDetails === undefined) ||
    (studentGroup?.group_id && latestDocuments === undefined) ||
    (studentGroup?.group_id && taskAssignments === undefined) ||
    (groupDetails?.adviser_id && adviser === undefined) ||
    (groupDetails?.requested_adviser && requestedAdviser === undefined);

  useEffect(() => {
    if (groupDetails?.adviser_id) {
      setPendingAdviserCode(null);
    }
  }, [groupDetails?.adviser_id]);

  // Handler for opening the popup
  const handleShowAdviserPopup = () => {
    if (adviserCodeInputRef.current) adviserCodeInputRef.current(); // clear input
    setShowAdviserPopup(true);
    setPopupError(null);
  };

  // Handler for closing the popup
  const handleCloseAdviserPopup = () => {
    if (adviserCodeInputRef.current) adviserCodeInputRef.current(); // clear input
    setShowAdviserPopup(false);
    setPopupError(null);
  };

  // Handler for submitting adviser code
  const handleAdviserCodeSubmit = async (code: string) => {
    setIsSubmitting(true);
    setPopupError(null);
    try {
      const result = await convex.query(api.fetch.getAdviserByCode, { code });
      if (!result || !result.adviser || !result.user) {
        setPopupError("Adviser code not found.");
        setIsSubmitting(false);
        return;
      }
      await requestAdviserCode({
        adviserCode: code,
        groupId: studentGroup!.group_id!,
      });
      setPendingAdviserCode(code);
      setShowAdviserPopup(false);
      addBanner({
        message: `Request sent to ${result.user.first_name} ${result.user.last_name}.`,
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
      if (adviserCodeInputRef.current) adviserCodeInputRef.current(); // clear input
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.editUser("group"),
      );
      setPopupError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine adviser object for table
  let adviserObj:
    | {
        first_name: string;
        middle_name?: string;
        last_name: string;
        pending?: boolean;
        pendingName?: string;
        onCancel?: () => void;
      }
    | undefined = undefined;
  
  // Only show adviser if adviser_id exists and is not undefined/null
  if (
    groupDetails &&
    groupDetails.adviser_id !== undefined &&
    groupDetails.adviser_id !== null &&
    adviser &&
    adviser.first_name
  ) {
    adviserObj = {
      first_name: adviser.first_name,
      middle_name: adviser.middle_name,
      last_name: adviser.last_name,
    };
  } else if (
    groupDetails &&
    groupDetails.requested_adviser &&
    (groupDetails.adviser_id === undefined || groupDetails.adviser_id === null) &&
    requestedAdviser &&
    requestedAdviser.first_name
  ) {
    adviserObj = {
      first_name: requestedAdviser.first_name,
      middle_name: requestedAdviser.middle_name,
      last_name: requestedAdviser.last_name,
      pending: true,
      pendingName: `${requestedAdviser.first_name} ${requestedAdviser.last_name}`,
      onCancel: () => setShowCancelPopup(true),
    };
  } else {
    // Explicitly set to undefined when no adviser
    adviserObj = undefined;
  }

  // Debug logging to see what's happening
  console.log('Manager page debug:', {
    groupDetails_adviser_id: groupDetails?.adviser_id,
    adviser: adviser,
    adviserObj: adviserObj
  });

  // Always get the adviser code for the pending request
  const pendingAdviserId = groupDetails?.requested_adviser;
  const pendingAdviserCodeObj = useQuery(
    api.fetch.getAdviserCode,
    pendingAdviserId ? { adviserId: pendingAdviserId } : "skip",
  );
  const effectivePendingAdviserCode =
    pendingAdviserCode || pendingAdviserCodeObj?.code;

  const handleConfirmCancelAdviserRequest = async () => {
    if (!effectivePendingAdviserCode || !studentGroup?.group_id) return;
    setIsSubmitting(true);
    try {
      await cancelAdviserRequest({
        adviserCode: effectivePendingAdviserCode,
        groupId: studentGroup.group_id,
      });
      setPendingAdviserCode(null);
      addBanner({
        message: "Adviser request cancelled.",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.editUser("group"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    } finally {
      setIsSubmitting(false);
      setShowCancelPopup(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Welcome Back, {user?.first_name ?? "Manager"}!
          </h1>
          <p className="text-muted-foreground">
            Overview of your group&apos;s documents
          </p>
        </div>
        {/* Adviser code popup */}
        <AdviserCodePopup
          isOpen={showAdviserPopup}
          onClose={handleCloseAdviserPopup}
          onSubmit={handleAdviserCodeSubmit}
          isSubmitting={isSubmitting}
          error={popupError}
          clearInputRef={adviserCodeInputRef}
        />
        {/* Latest Documents Table */}
        <div className="container mx-auto px-4 pb-8">
          <LatestDocumentsTable
            documents={latestDocuments?.documents ?? []}
            status={
              isLoading
                ? "loading"
                : !studentGroup?.group_id
                  ? "no_group"
                  : "idle"
            }
            currentUserId={studentId as Id<"users">}
            capstoneTitle={groupDetails?.capstone_title ?? "Capstone Documents"}
            grade={groupDetails?.grade}
            adviser={adviserObj}
            onShowAdviserPopup={handleShowAdviserPopup}
            isSubmitting={isSubmitting}
            mode="manager"
            tasks={taskAssignments?.tasks ?? []}
            group={
              groupDetails
                ? {
                    _id: groupDetails._id,
                    project_manager_id: groupDetails.project_manager_id,
                    member_ids: groupDetails.member_ids,
                  }
                : undefined
            }
          />
        </div>
        <CancelAdviserRequestPopup
          isOpen={showCancelPopup}
          onClose={() => setShowCancelPopup(false)}
          onConfirm={handleConfirmCancelAdviserRequest}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};

export default ManagerHomePage;
