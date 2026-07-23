import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canShare } from "@/lib/permissions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const link = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const access = await getAccess(user.id, link.documentId);
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
