"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Paperclip } from "lucide-react";
import { AttachmentPanel } from "@/components/attachment-panel";
import { CommentsPanel } from "@/components/comments-panel";
import type { AccessLevel } from "@/lib/permissions";

export function RightRail({
  docId,
  access,
  currentUserId,
}: {
  docId: string;
  access: AccessLevel;
  currentUserId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"comments" | "files">("files");

  const canUpload = access === "owner" || access === "editor" || access === "commenter";
  const canDelete = access === "owner" || access === "editor";
  const canComment = access === "owner" || access === "editor" || access === "commenter";

  useEffect(() => {
    const onCreate = () => {
      setActiveTab("comments");
    };
    window.addEventListener("comment-create", onCreate);
    return () => window.removeEventListener("comment-create", onCreate);
  }, []);

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white">
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("comments")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "comments"
              ? "border-black bg-zinc-50 text-black"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black"
          }`}
        >
          <MessageSquare className="size-3.5" />
          Comments
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "files"
              ? "border-black bg-zinc-50 text-black"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black"
          }`}
        >
          <Paperclip className="size-3.5" />
          Files
        </button>
      </div>

      <div className="flex flex-1 overflow-y-auto">
        {activeTab === "comments" ? (
          <CommentsPanel docId={docId} canComment={canComment} currentUserId={currentUserId} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <AttachmentPanel
              docId={docId}
              canUpload={canUpload}
              canDelete={canDelete}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
