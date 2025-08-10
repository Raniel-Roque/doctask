"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";

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
  editCount: number;
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
          .slice(0, 3); // Show top 3 editors max

      setRecentEditors(uniqueEditors);
      setIsLoading(false);
    }
  }, [editorUsers, recentEdits]);

  if (isLoading || !recentEditors.length) {
    return null;
  }

    return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
          <span className="font-medium">Last edited by:</span>
          <div className="flex items-center gap-1">
            {recentEditors.slice(0, 2).map((editor, index) => (
              <span key={editor._id} className="text-gray-700">
                {editor.name}
                {index < Math.min(recentEditors.length - 1, 1) && (
                  <span className="text-gray-400">, </span>
                )}
              </span>
            ))}
            {recentEditors.length > 2 && (
              <span className="text-gray-500">
                +{recentEditors.length - 2} more
              </span>
            )}
            <ChevronDownIcon className="w-3 h-3 text-gray-400" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-900">All recent editors</h4>
          <div className="space-y-1">
            {recentEditors.map((editor) => (
              <div key={editor._id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{editor.name}</span>
                <span className="text-gray-500 text-xs">
                  {editor.editCount} edit{editor.editCount !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 pt-1 border-t">
            Since last version ({new Date(liveDocument?.lastVersionTime || 0).toLocaleDateString()})
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
