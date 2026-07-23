"use client";

import { useState } from "react";
import { Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()~|])/g, "\\$1");
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeFilename(title: string): string {
  const sanitized = title
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return sanitized || "document";
}

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as Element;
  const children = () => Array.from(el.childNodes).map(inline).join("");
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "strong":
    case "b":
      return `**${children()}**`;
    case "em":
    case "i":
      return `*${children()}*`;
    case "u":
      return `<u>${children()}</u>`;
    case "a":
      return `[${children()}](${el.getAttribute("href") ?? ""})`;
    case "img":
      return `![${el.getAttribute("alt") ?? ""}](${el.getAttribute("src") ??
        ""})`;
    case "br":
      return "\n";
    default:
      return children();
  }
}

function listItemContent(li: Element): string {
  const first = li.firstElementChild;
  if (first && first.tagName.toLowerCase() === "p") {
    return inline(first).trim();
  }
  return inline(li).trim();
}

function blockToMarkdown(node: Element): string {
  const tag = node.tagName.toLowerCase();

  switch (tag) {
    case "h1":
      return `# ${inline(node).trim()}`;
    case "h2":
      return `## ${inline(node).trim()}`;
    case "h3":
      return `### ${inline(node).trim()}`;
    case "p":
      return inline(node).trim();
    case "ul":
      return Array.from(node.children)
        .map((li) => `- ${listItemContent(li as Element)}`)
        .join("\n");
    case "ol":
      return Array.from(node.children)
        .map((li, i) => `${i + 1}. ${listItemContent(li as Element)}`)
        .join("\n");
    default:
      return inline(node).trim();
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.children)
    .map(blockToMarkdown)
    .filter(Boolean)
    .join("\n\n");
}

function downloadMarkdown(title: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printPdf(title: string, html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Popup blocked");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      margin: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #000;
      line-height: 1.6;
      margin: 0;
      padding: 20mm;
    }
    @media screen {
      body {
        max-width: 720px;
        margin: 40px auto;
        padding: 20px;
      }
    }
    h1 { font-size: 1.875rem; font-weight: 800; margin-top: 1.5em; }
    h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25em; }
    h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1em; }
    ul, ol { padding-left: 1.5rem; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin-top: 0.25em; }
    img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    p { margin: 0.75em 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 200);
}

export function ExportDialog({
  title,
  getContent,
}: {
  title: string;
  getContent: () => string;
}) {
  const [open, setOpen] = useState(false);

  const handleMarkdown = () => {
    const markdown = htmlToMarkdown(getContent());
    downloadMarkdown(title, markdown);
    setOpen(false);
    toast.success("Markdown downloaded");
  };

  const handlePdf = () => {
    printPdf(title, getContent());
    setOpen(false);
    toast.success("PDF print dialog opened");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:translate-y-px"
        >
          <Download className="size-4" />
          Export
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export document</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">Choose a format to download this document.</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleMarkdown}>
            <FileText className="size-4" />
            Markdown
          </Button>
          <Button variant="outline" onClick={handlePdf}>
            <FileDown className="size-4" />
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
