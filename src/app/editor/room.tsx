"use client";

import { ReactNode, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { getUsers } from "./actions";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { Button } from "@/components/ui/button";
import { DocumentEditor } from "./document-editor";

interface RoomProps {
  children?: ReactNode;
  title?: string;
  isEditable?: boolean;
  userType?: "manager" | "member";
  capstoneTitle?: string;
}

type User = {
  id: string;
  name: string;
  avatar: string;
  color: string;
};

export function Room({ children, title, isEditable, userType, capstoneTitle }: RoomProps) {
  const params = useParams();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        setError("Failed to load users");
      }
    };

    fetchUsers();
  }, []);

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
        userIds.map((userId) => {
          const user = users.find((user) => user.id === userId);
          return user
            ? {
                name: user.name,
                avatar: user.avatar,
                color: user.color,
              }
            : undefined;
        })
      }
    >
      <RoomProvider
        id={params.documentId as string}
        initialPresence={{ cursor: null, selection: null }}
      >
        <ClientSideSuspense
          fallback={<FullscreenLoader label="Loading document editor..." />}
        >
          {title && isEditable !== undefined && userType ? (
            <DocumentEditor
              title={title}
              isEditable={isEditable}
              userType={userType}
              capstoneTitle={capstoneTitle}
            />
          ) : (
            children
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
