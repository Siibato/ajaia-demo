"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ImagePlus,
  MessageSquarePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarButton({
  isActive,
  disabled,
  label,
  onClick,
  children,
}: {
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 select-none items-center justify-center rounded-lg transition-colors",
        isActive
          ? "bg-zinc-200 text-black"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-black",
        "disabled:pointer-events-none disabled:opacity-40"
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  editor,
  editable = true,
  onImageInsert,
  onComment,
  canComment,
}: {
  editor: Editor | null;
  editable?: boolean;
  onImageInsert?: () => void;
  onComment?: () => void;
  canComment?: boolean;
}) {
  const toggleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      if (!editor) return;
      editor.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const setParagraph = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setParagraph().run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-3 py-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-3 py-2">
      {editable && (
        <>
          <ToolbarButton
            label="Bold"
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Italic"
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Underline"
            isActive={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          <ToolbarButton
            label="Paragraph"
            isActive={editor.isActive("paragraph")}
            onClick={setParagraph}
          >
            <Pilcrow className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Heading 1"
            isActive={editor.isActive("heading", { level: 1 })}
            onClick={() => toggleHeading(1)}
          >
            <Heading1 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Heading 2"
            isActive={editor.isActive("heading", { level: 2 })}
            onClick={() => toggleHeading(2)}
          >
            <Heading2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Heading 3"
            isActive={editor.isActive("heading", { level: 3 })}
            onClick={() => toggleHeading(3)}
          >
            <Heading3 className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          <ToolbarButton
            label="Bullet list"
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Numbered list"
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          <ToolbarButton
            label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>

          {onImageInsert && (
            <>
              <div className="mx-1 h-5 w-px bg-zinc-200" />
              <ToolbarButton label="Insert image" onClick={onImageInsert}>
                <ImagePlus className="size-4" />
              </ToolbarButton>
            </>
          )}
        </>
      )}

      {onComment && canComment && (
        <>
          {editable && <div className="mx-1 h-5 w-px bg-zinc-200" />}
          <ToolbarButton label="Comment" onClick={onComment}>
            <MessageSquarePlus className="size-4" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
