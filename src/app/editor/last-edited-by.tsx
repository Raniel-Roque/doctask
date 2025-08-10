"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface LastEditedByProps {
  documentId?: Id<"documents">;
  groupId?: string;
  chapter?: string;
}

interface RecentEditor {
  _id: Id<"users">;
  name: string;
  email: string;
}

export const LastEditedBy = ({ documentId, groupId, chapter }: LastEditedByProps) => {
  const [recentEditors, setRecentEditors] = useState<RecentEditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the live document to find the last version time
  const liveDocument = useQuery(api.fetch.getLiveDocument, {
    groupId: groupId || "",
    chapter: chapter || "",
  });

  // Get recent edits since the last version
  const recentEdits = useQuery(api.fetch.getRecentDocumentEdits, {
    documentId: documentId || (liveDocument?._id as Id<"documents">),
    sinceVersionTime: liveDocument?.lastVersionTime || 0,
  });

  // Get user details for recent editors
  const editorUserIds = recentEdits?.map(edit => edit.userId) || [];
  const editorUsers = useQuery(api.fetch.getUsersByIds, {
    userIds: editorUserIds,
  });

  useEffect(() => {
    if (editorUsers && recentEdits) {
      // Create a map of user IDs to edit counts
      const editCounts = new Map<Id<"users">, number>();
      recentEdits.forEach(edit => {
        editCounts.set(edit.userId, (editCounts.get(edit.userId) || 0) + 1);
      });

             // Get unique recent editors with their edit counts
       const uniqueEditors = editorUsers
         .filter(user => user && !user.isDeleted)
         .map(user => ({
           _id: user._id,
           name: user.name,
           email: user.email,
           editCount: editCounts.get(user._id) || 0,
         }))
         .sort((a, b) => b.editCount - a.editCount) // Sort by edit count
         .slice(0, 5); // Show top 5 editors

      setRecentEditors(uniqueEditors);
      setIsLoading(false);
    }
  }, [editorUsers, recentEdits]);

  if (isLoading || !recentEditors.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
      <span className="font-medium">Last edited by:</span>
      <div className="flex items-center gap-1">
                 {recentEditors.slice(0, 3).map((editor, index) => (
           <div key={editor._id} className="flex items-center gap-1">
             <Avatar className="w-6 h-6">
               <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                 {editor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
               </AvatarFallback>
             </Avatar>
             {index < Math.min(recentEditors.length - 1, 2) && (
               <span className="text-gray-400">,</span>
             )}
           </div>
         ))}
        {recentEditors.length > 3 && (
          <span className="text-gray-500 text-xs">
            +{recentEditors.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};
