"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Paperclip, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-react";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AttachmentPanel({
  docId,
  canUpload,
  canDelete,
}: {
  docId: string;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    const res = await fetch(`/api/documents/${docId}/attachments`);
    if (res.ok) {
      const data = await res.json();
      setAttachments(data);
    }
    setLoading(false);
  }, [docId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAttachments();
  }, [fetchAttachments]);

  const { startUpload, isUploading } = useUploadThing("sideAttachment", {
    onClientUploadComplete: () => {
      toast.success("Attachment uploaded");
      fetchAttachments();
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      startUpload(files, { documentId: docId });
    }
    e.target.value = "";
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Attachment deleted");
      fetchAttachments();
    } else {
      toast.error("Failed to delete attachment");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-black transition-colors hover:bg-zinc-100 active:translate-y-px disabled:opacity-50"
          >
            <Upload className="size-4" />
            {isUploading ? "Uploading..." : "Upload file"}
          </button>
        </>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-zinc-100"
            />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100">
            <Paperclip className="size-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            No attachments yet
          </p>
          {canUpload && (
            <p className="mt-0.5 text-[10px] text-zinc-400">
              Upload files to attach them here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-black">
                    {att.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatSize(att.sizeBytes)} · {formatDate(att.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={att.url}
                    download={att.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-black"
                    title="Download"
                  >
                    <Download className="size-3.5" />
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(att.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
