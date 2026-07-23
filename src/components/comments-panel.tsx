"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

type Comment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

type Thread = {
  id: string;
  from: number | null;
  to: number | null;
  deletedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  comments: Comment[];
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CommentsPanel({
  docId,
  canComment,
  currentUserId,
}: {
  docId: string;
  canComment: boolean;
  currentUserId?: string;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState("");
  const threadRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchThreads = useCallback(async () => {
    const res = await fetch(`/api/documents/${docId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setThreads(data);
    }
    setLoading(false);
  }, [docId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    const onCreate = (e: Event) => {
      const { threadId } = (e as CustomEvent).detail;
      setPendingThreadId(threadId);
      setPendingComment("");
      setActiveThreadId(null);
    };
    const onThreadClick = (e: Event) => {
      const { threadId } = (e as CustomEvent).detail;
      setActiveThreadId(threadId);
      setPendingThreadId(null);
      const el = threadRefs.current[threadId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    const onCommentUpdated = () => {
      fetchThreads();
    };
    window.addEventListener("comment-create", onCreate);
    window.addEventListener("comment-thread-click", onThreadClick);
    window.addEventListener("comment-updated", onCommentUpdated);
    return () => {
      window.removeEventListener("comment-create", onCreate);
      window.removeEventListener("comment-thread-click", onThreadClick);
      window.removeEventListener("comment-updated", onCommentUpdated);
    };
  }, [fetchThreads]);

  async function submitPendingComment() {
    if (!pendingThreadId || !pendingComment.trim()) return;
    const res = await fetch(`/api/documents/${docId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: pendingThreadId,
        body: pendingComment.trim(),
      }),
    });
    if (res.ok) {
      setPendingThreadId(null);
      setPendingComment("");
      toast.success("Comment added");
      fetchThreads();
    } else {
      toast.error("Failed to add comment");
    }
  }

  async function submitReply(threadId: string) {
    const text = replyTexts[threadId]?.trim();
    if (!text) return;
    const res = await fetch(`/api/documents/${docId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, body: text }),
    });
    if (res.ok) {
      setReplyTexts((prev) => ({ ...prev, [threadId]: "" }));
      toast.success("Reply added");
      fetchThreads();
    } else {
      toast.error("Failed to add reply");
    }
  }

  async function deleteComment(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Comment deleted");
      fetchThreads();
    } else {
      toast.error("Failed to delete comment");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : threads.length === 0 && !pendingThreadId ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100">
            <MessageSquare className="size-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            No comments yet
          </p>
          {canComment && (
            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">
              Select text and click the Comment button to start a discussion.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pendingThreadId && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-medium text-amber-800">
                New comment thread
              </p>
              <textarea
                value={pendingComment}
                onChange={(e) => setPendingComment(e.target.value)}
                placeholder="Write a comment..."
                autoFocus
                rows={3}
                className="w-full resize-none rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm text-black outline-none placeholder:text-zinc-400 focus:border-amber-400"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setPendingThreadId(null);
                    setPendingComment("");
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPendingComment}
                  disabled={!pendingComment.trim()}
                  className="flex items-center gap-1 rounded-lg bg-black px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                >
                  <Send className="size-3" />
                  Comment
                </button>
              </div>
            </div>
          )}

          {threads.map((thread) => (
            <div
              key={thread.id}
              ref={(el) => {
                threadRefs.current[thread.id] = el;
              }}
              className={`rounded-xl border p-3 transition-colors ${
                activeThreadId === thread.id
                  ? "border-amber-300 bg-amber-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">
                  {thread.createdBy.name ?? "Unknown"} ·{" "}
                  {formatRelativeTime(thread.createdAt)}
                </span>
              </div>

              <div className="space-y-2">
                {thread.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="group rounded-lg bg-zinc-50 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-black">
                          {comment.authorName ?? "Unknown"}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {formatRelativeTime(comment.createdAt)}
                        </p>
                      </div>
                      {comment.authorId === currentUserId && (
                        <button
                          onClick={() =>
                            deleteComment(comment.id)
                          }
                          className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-all hover:bg-zinc-200 hover:text-red-600 group-hover:opacity-100"
                          title="Delete comment"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-700">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>

              {canComment && (
                <div className="mt-2 flex items-end gap-2">
                  <textarea
                    value={replyTexts[thread.id] ?? ""}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({
                        ...prev,
                        [thread.id]: e.target.value,
                      }))
                    }
                    placeholder="Reply..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-black outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                  />
                  <button
                    onClick={() => submitReply(thread.id)}
                    disabled={!(replyTexts[thread.id] ?? "").trim()}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-black disabled:opacity-40"
                    title="Send reply"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
