"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { Button } from "@/components/ui/button";
import { DocumentEditor } from "./document-editor";
import { getUsers } from "./actions";
import { Id } from "../../../convex/_generated/dataModel";

interface RoomProps {
  children?: ReactNode;
  title?: string;
  isEditable?: boolean;
  userType?: "manager" | "member" | "adviser";
  capstoneTitle?: string;
  groupId?: string;
  chapter?: string;
  saveToDatabase?: () => Promise<void>;
  liveDocumentId?: string;
  documentId?: Id<"documents">; // Add document ID for tracking edits
  toolbarMode?: "default" | "adviserViewOnly" | "adviserEdit";
  backUrl?: string;
  isOffline?: boolean;
  isDataSynced?: boolean;
}

type User = { id: string; name: string; avatar: string; color: string };

export function Room(props: RoomProps) {
  const params = useParams();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use live document ID for Liveblocks room, fallback to URL document ID
  const roomId = props.liveDocumentId || (params.documentId as string);

  const fetchUsers = useCallback(async () => {
    try {
      // Get document ID from props or params
      const documentId = props.liveDocumentId || (params.documentId as string);
      const list = await getUsers(documentId as Id<"documents">);
      setUsers(list);
    } catch {}
  }, [props.liveDocumentId, params.documentId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    // Listen for authentication errors via global error handling
    const handleError = (event: ErrorEvent) => {
      const message = event.message?.toLowerCase() || "";

      if (
        message.includes("authentication failed") ||
        message.includes("unauthorized")
      ) {
        setError("auth");
      } else if (message.includes("timed out") || message.includes("timeout")) {
        setError("timeout");
      } else if (
        message.includes("connection") ||
        message.includes("network")
      ) {
        setError("connection");
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  const getErrorMessage = () => {
    switch (error) {
      case "auth":
        return "You don't have permission to access this document. Please check your account permissions.";
      case "timeout":
        return "Connection timed out. Please check your internet connection and try again.";
      case "connection":
        return "Unable to connect to the collaboration server. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // Show error UI when Liveblocks has given up (after its internal retries)
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error === "auth" ? "Access Denied" : "Connection Failed"}
          </h2>
          <p className="text-gray-600 mb-2">{getErrorMessage()}</p>
        </div>

        <div className="flex gap-4">
          {error !== "auth" && (
            <Button onClick={handleRetry} variant="default">
              Try Again
            </Button>
          )}
          <Button onClick={handleGoBack} variant="outline">
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={"/api/liveblocks-auth"}
      resolveUsers={({ userIds }) =>
        userIds.map(
          (userId) => users.find((user) => user.id === userId) ?? undefined,
        )
      }
      resolveMentionSuggestions={({ text }) => {
        let filteredUsers = users;

        if (text) {
          filteredUsers = users.filter((user) =>
            user.name.toLowerCase().includes(text.toLowerCase()),
          );
        }

        return filteredUsers.map((user) => user.id);
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, selection: null }}
      >
        <ClientSideSuspense
          fallback={<FullscreenLoader label="Loading document editor..." />}
        >
          {props.title && props.isEditable !== undefined && props.userType ? (
            <DocumentEditor
              {...props}
              documentId={props.documentId}
              isOffline={props.isOffline}
              isDataSynced={props.isDataSynced}
            />
          ) : (
            props.children
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
