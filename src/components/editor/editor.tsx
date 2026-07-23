"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/editor/toolbar";
import { ShareDialog } from "@/components/share-dialog";
import { ExportDialog } from "@/components/editor/export-dialog";
import { CommentMark } from "@/components/editor/comment-mark";

type SaveStatus = "saved" | "saving" | "unsaved";

export function Editor({
  docId,
  initialTitle,
  initialContent,
  editable,
  shareable = false,
  sticky = false,
  canComment = false,
  onTitleChange,
}: {
  docId: string;
  initialTitle: string;
  initialContent: string;
  editable: boolean;
  shareable?: boolean;
  sticky?: boolean;
  canComment?: boolean;
  onTitleChange?: (docId: string, title: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<string>(initialContent);
  const titleRef = useRef<string>(initialTitle);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const save = useCallback(
    async (content?: string) => {
      const body: { title: string; content: string } = {
        title: titleRef.current,
        content: content ?? contentRef.current,
      };

      setStatus("saving");
      try {
        const res = await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setStatus("saved");
          setLastSavedAt(new Date());
          isDirtyRef.current = false;
          return true;
        } else {
          setStatus("unsaved");
          toast.error("Failed to save");
          return false;
        }
      } catch {
        setStatus("unsaved");
        toast.error("Failed to save");
        return false;
      }
    },
    [docId]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false }),
      CommentMark,
    ],
    content: initialContent || "",
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose-content tiptap-editor",
          "min-h-[400px] max-w-none p-0 focus:outline-none",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:mt-1.5em",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-1.25em",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-1em",
          "[&_p]:leading-relaxed [&_p]:mb-2",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg",
          "[&_p+*]:mt-3"
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      contentRef.current = html;
      if (editable || canComment) {
        isDirtyRef.current = true;
        setStatus("unsaved");

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          save(html);
        }, 800);
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        if (!editable) return;
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        contentRef.current = editor.getHTML();
        save(contentRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, save, editable]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function handleTitleBlur() {
    if (titleRef.current !== initialTitle || isDirtyRef.current) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const saved = await save(contentRef.current);
      if (saved) {
        onTitleChange?.(docId, titleRef.current);
      }
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }

  const [timeAgoText, setTimeAgoText] = useState("Saved");

  useEffect(() => {
    if (status !== "saved" || !lastSavedAt) return;

    const compute = () => {
      const seconds = Math.floor(
        (Date.now() - lastSavedAt.getTime()) / 1000
      );
      if (seconds < 5) setTimeAgoText("Saved");
      else if (seconds < 60) setTimeAgoText(`Saved ${seconds}s ago`);
      else setTimeAgoText(`Saved ${Math.floor(seconds / 60)}m ago`);
    };

    compute();
    const interval = setInterval(compute, 5000);
    return () => clearInterval(interval);
  }, [status, lastSavedAt]);

  const statusText =
    status === "saving"
      ? "Saving..."
      : status === "unsaved"
        ? "Unsaved changes"
        : timeAgoText;

  const headerStickyClass = sticky ? "sticky top-0 z-30 bg-white" : "bg-white";

  const handleComment = useCallback(() => {
    if (!editor || !canComment) return;
    if (editor.state.selection.empty) return;

    const { from, to } = editor.state.selection;
    const threadId = crypto.randomUUID();
    if (editor.isEditable) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setComment(threadId)
        .run();
    } else {
      editor.chain().setTextSelection({ from, to }).setComment(threadId).run();
    }

    const html = editor.getHTML();
    contentRef.current = html;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(html);

    window.dispatchEvent(
      new CustomEvent("comment-create", {
        detail: { threadId, from, to },
      })
    );
  }, [editor, canComment, save]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const markEl = target.closest("[data-thread-id]") as HTMLElement | null;
    if (markEl) {
      const threadId = markEl.getAttribute("data-thread-id");
      if (threadId) {
        window.dispatchEvent(
          new CustomEvent("comment-thread-click", { detail: { threadId } })
        );
      }
    }
  }, []);

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className={headerStickyClass}>
          <div className="border-b border-zinc-200 px-6 py-4">
            <div className="mx-auto flex w-full max-w-[720px] items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  disabled={!editable}
                  placeholder="Untitled"
                  className="w-full border-none bg-transparent text-2xl font-extrabold tracking-tight text-black outline-none placeholder:text-zinc-300 disabled:cursor-default"
                />
                <p className="mt-1 text-xs text-zinc-400">{statusText}</p>
              </div>
              <div className="flex items-center gap-2">
                {shareable && <ShareDialog docId={docId} />}
                <ExportDialog title={title} getContent={() => editor.getHTML()} />
              </div>
            </div>
          </div>

          {(editable || canComment) && (
            <div className="mx-auto w-full max-w-[720px]">
              <Toolbar
                editor={editor}
                editable={editable}
                onComment={handleComment}
                canComment={canComment}
              />
            </div>
          )}
        </div>

        <div className="bg-zinc-50 px-4 py-6" onClick={handleEditorClick}>
          <div className="relative mx-auto w-full min-h-[calc(100vh-8rem)] max-w-[720px] bg-white p-8 shadow-sm ring-1 ring-zinc-200 sm:rounded-xl sm:p-10">
            <EditorContent editor={editor} />
            {editor.isEmpty && (
              <p className="pointer-events-none absolute left-10 top-10 text-zinc-400">
                Start writing...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
