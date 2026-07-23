"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export function ImportButton({
  onImported,
  variant = "default",
}: {
  onImported?: (documentId: string) => void;
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const file = files[0];
    setIsImporting(true);

    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File too large");
      }

      const ext = file.name.toLowerCase().split(".").pop();
      let content = "";

      if (ext === "md") {
        const text = await file.text();
        const { marked } = await import("marked");
        content = marked.parse(text) as string;
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = result.value;
      } else {
        throw new Error("Only .md and .docx files are supported");
      }

      const title = file.name.replace(/\.[^.]+$/, "").slice(0, 200);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      const data = (await res.json()) as {
        documentId?: string;
        error?: string;
      };

      if (!res.ok || !data.documentId) {
        throw new Error(data.error ?? "Import failed");
      }

      toast.success("Document imported");
      if (onImported) {
        onImported(data.documentId);
      } else {
        router.push(`/docs/${data.documentId}`);
      }
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsImporting(false);
    }

    e.target.value = "";
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className={
          variant === "compact"
            ? "flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-100 active:translate-y-px disabled:opacity-50"
            : "flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-100 active:translate-y-px disabled:opacity-50"
        }
      >
        <FileUp className="size-4" />
        {isImporting ? "Importing..." : "Import document"}
      </button>
    </>
  );
}
