import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, threadId: true },
  });

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (comment.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id } });

  const remaining = await prisma.comment.count({
    where: { threadId: comment.threadId },
  });

  if (remaining === 0) {
    await prisma.commentThread.update({
      where: { id: comment.threadId },
      data: { deletedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
