import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canEdit } from "@/lib/permissions";
import { utapi } from "@/lib/uploadthing";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: { fileKey: true, documentId: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await getAccess(user.id, attachment.documentId);
  if (!canEdit(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await utapi.deleteFiles(attachment.fileKey);
  await prisma.attachment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
