// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Cursor position for collaborative editing
      cursor: { x: number; y: number } | null;
      // Text selection for collaborative highlighting
      selection: {
        from: number;
        to: number;
        color: string;
      } | null;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Record<string, never>;

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {
      type: "cursor-moved";
      cursor: { x: number; y: number };
    } | {
      type: "selection-changed";
      selection: { from: number; to: number; color: string } | null;
    };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      // Coordinates for comment positioning
      x: number;
      y: number;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      // Room info for document
      title: string;
      id: string;
    };
  }
}

export {};
