"use client";

import { Plus, Trash2 } from "lucide-react";
import { ImportButton } from "@/components/import-button";

export type OwnedDoc = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

export type SharedDoc = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  owner: { id: string; name: string | null; email: string };
  role: string;
};

function roleBadgeClass(role: string) {
  switch (role) {
    case "EDITOR":
      return "bg-black text-white";
    case "COMMENTER":
      return "bg-zinc-200 text-black";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "EDITOR":
      return "Editor";
    case "COMMENTER":
      return "Commenter";
    default:
      return "Viewer";
  }
}

interface DocumentSidebarProps {
  owned: OwnedDoc[];
  shared: SharedDoc[];
  loading: boolean;
  creating: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNewDocument: () => void;
  onImported?: (documentId: string) => void;
}

export function DocumentSidebar({
  owned,
  shared,
  loading,
  creating,
  onOpen,
  onDelete,
  onNewDocument,
  onImported,
}: DocumentSidebarProps) {
  return (
    <aside className="h-full w-full overflow-y-auto border-r border-zinc-200 bg-white p-4">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={onNewDocument}
            disabled={creating}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-black px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:translate-y-px disabled:opacity-50"
          >
            <Plus className="size-4" />
            {creating ? "Creating..." : "New document"}
          </button>
          <ImportButton onImported={onImported} variant="compact" />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-black">
            Owned Documents
          </h2>
          <div className="space-y-1">
            {loading ? (
              <p className="text-sm text-zinc-400">Loading...</p>
            ) : owned.length === 0 ? (
              <p className="text-sm text-zinc-400">No documents yet</p>
            ) : (
              owned.map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100"
                >
                  <button
                    onClick={() => onOpen(doc.id)}
                    className="flex-1 truncate text-left text-sm text-black"
                  >
                    {doc.title}
                  </button>
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="ml-2 hidden text-zinc-400 hover:text-red-600 group-hover:block"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-black">
            Shared with Me
          </h2>
          <div className="space-y-1">
            {loading ? (
              <p className="text-sm text-zinc-400">Loading...</p>
            ) : shared.length === 0 ? (
              <p className="text-sm text-zinc-400">No shared documents</p>
            ) : (
              shared.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100"
                >
                  <button
                    onClick={() => onOpen(doc.id)}
                    className="flex-1 truncate text-left text-sm text-black"
                  >
                    {doc.title}
                  </button>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(doc.role)}`}
                  >
                    {roleLabel(doc.role)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
