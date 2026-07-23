import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canView, canEdit, canShare, canComment } from "@/lib/permissions";
import { collectThreadIds } from "@/lib/comment-utils";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getAccess(user.id, id);
  if (!canView(access)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...doc,
    access,
    editable: canEdit(access),
    shareable: canShare(access),
    canComment: canComment(access),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getAccess(user.id, id);
  if (!canView(access)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.document.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const titleChanged =
    parsed.data.title !== undefined && parsed.data.title !== existing.title;
  if (titleChanged && !canEdit(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.content !== undefined && !canEdit(access) && !canComment(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { title?: string; content?: unknown } = {};
  if (titleChanged) data.title = parsed.data.title;
  if (parsed.data.content !== undefined) data.content = parsed.data.content;

  const doc = await prisma.document.update({
    where: { id },
    data: data as { title?: string; content?: object },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
  });

  if (parsed.data.content !== undefined) {
    const activeThreadIds = collectThreadIds(parsed.data.content);
    const existingThreads = await prisma.commentThread.findMany({
      where: { documentId: id, deletedAt: null },
      select: { id: true },
    });
    const orphanIds = existingThreads
      .map((t) => t.id)
      .filter((tid) => !activeThreadIds.includes(tid));
    if (orphanIds.length > 0) {
      await prisma.commentThread.updateMany({
        where: { id: { in: orphanIds } },
        data: { deletedAt: new Date() },
      });
    }
  }

  return NextResponse.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getAccess(user.id, id);
  if (access !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
