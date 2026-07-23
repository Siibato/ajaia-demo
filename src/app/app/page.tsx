"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { FileText, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Editor } from "@/components/editor/editor";
import {
  DocumentSidebar,
  type OwnedDoc,
  type SharedDoc,
} from "@/components/document-sidebar";
import { RightRail } from "@/components/right-rail";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { AccessLevel } from "@/lib/permissions";

type SelectedDoc = {
  id: string;
  title: string;
  content: string;
  access: AccessLevel;
  editable: boolean;
  shareable: boolean;
  canComment: boolean;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [owned, setOwned] = useState<OwnedDoc[]>([]);
  const [shared, setShared] = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setOwned(data.owned || []);
      setShared(data.shared || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocs();
  }, [fetchDocs]);

  async function openDocument(id: string) {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data);
      }
    } finally {
      setLoadingDoc(false);
    }
  }

  async function handleImported(id: string) {
    await openDocument(id);
    fetchDocs();
  }

  async function handleNewDocument() {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const { id } = await res.json();
        toast.success("Document created");
        await openDocument(id);
        fetchDocs();
      } else {
        toast.error("Failed to create document");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      toast.success("Document deleted");
      fetchDocs();
    } else {
      toast.error("Failed to delete document");
    }
  }

  function handleTitleChange(docId: string, title: string) {
    setOwned((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, title } : doc))
    );
    setShared((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, title } : doc))
    );
    setSelectedDoc((prev) =>
      prev && prev.id === docId ? { ...prev, title } : prev
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-black text-white">
              <FileText className="size-4" />
            </div>
            <span className="text-lg font-bold text-black">Ajaia</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-500">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-black transition-colors hover:bg-zinc-100 active:translate-y-px"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1"
      >
        <ResizablePanel
          defaultSize="20%"
          minSize="15%"
          maxSize="30%"
          className="min-w-0"
        >
          <DocumentSidebar
            owned={owned}
            shared={shared}
            loading={loading}
            creating={creating}
            onOpen={openDocument}
            onDelete={handleDelete}
            onNewDocument={handleNewDocument}
            onImported={handleImported}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="80%" className="min-w-0">
        <main className="flex h-full flex-col overflow-hidden">
          {selectedDoc ? (
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
              <ResizablePanel
                defaultSize="75%"
                minSize="50%"
                className="min-w-0"
              >
              <div className="h-full w-full overflow-hidden bg-zinc-50">
                {loadingDoc ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-zinc-400">Loading document...</p>
                  </div>
                ) : (
                  <Editor
                    key={selectedDoc.id}
                    docId={selectedDoc.id}
                    initialTitle={selectedDoc.title}
                    initialContent={selectedDoc.content}
                    editable={selectedDoc.editable}
                    shareable={selectedDoc.shareable}
                    canComment={selectedDoc.canComment}
                    sticky
                    onTitleChange={handleTitleChange}
                  />
                )}
              </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize="25%"
                minSize="20%"
                maxSize="35%"
                className="min-w-0"
              >
                <RightRail docId={selectedDoc.id} access={selectedDoc.access} currentUserId={session?.user?.id} />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-100">
                  <FileText className="size-8 text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-extrabold tracking-tight text-black">
                    {owned.length === 0 && shared.length === 0
                      ? "No documents yet"
                      : "Your documents"}
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Select a document from the sidebar to start editing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
