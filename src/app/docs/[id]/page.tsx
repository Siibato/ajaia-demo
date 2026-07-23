import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canView, canEdit, canShare, canComment } from "@/lib/permissions";
import { Editor } from "@/components/editor/editor";
import { RightRail } from "@/components/right-rail";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin");

  const { id } = await params;
  const access = await getAccess(user.id, id);
  if (!canView(access)) notFound();

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      ownerId: true,
    },
  });

  if (!doc) notFound();

  const editable = canEdit(access);
  const shareable = canShare(access);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-lg font-bold text-black">Ajaia</span>
          </div>
          <div className="flex items-center gap-3">
            {!editable && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                {access === "viewer"
                  ? "Viewer"
                  : access === "commenter"
                    ? "Commenter"
                    : "Read only"}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col overflow-hidden">
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
        >
          <ResizablePanel
            defaultSize="75%"
            minSize="50%"
            className="min-w-0"
          >
            <div className="h-full w-full overflow-hidden bg-zinc-50">
              <Editor
                docId={doc.id}
                initialTitle={doc.title}
                initialContent={doc.content as string}
                editable={editable}
                shareable={shareable}
                canComment={canComment(access)}
                sticky
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize="25%"
            minSize="20%"
            maxSize="35%"
            className="min-w-0"
          >
            <RightRail docId={doc.id} access={access} currentUserId={user.id} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
