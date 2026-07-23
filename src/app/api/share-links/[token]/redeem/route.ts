import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const roleRank = { VIEWER: 0, COMMENTER: 1, EDITOR: 2 };

export async function POST(
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

  if (link.revokedAt) {
    return NextResponse.json({ error: "Link has been revoked" }, { status: 410 });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link has expired" }, { status: 410 });
  }

  // Check if user already has a share — never downgrade
  const existing = await prisma.documentShare.findUnique({
    where: {
      documentId_userId: { documentId: link.documentId, userId: user.id },
    },
  });

  if (existing) {
    if (roleRank[existing.role] >= roleRank[link.role]) {
      // Existing role is equal or higher — don't downgrade
      return NextResponse.json({ documentId: link.documentId });
    }
    // Upgrade to the link's role
    await prisma.documentShare.update({
      where: { id: existing.id },
      data: { role: link.role },
    });
  } else {
    // Check if user is the owner
    const doc = await prisma.document.findUnique({
      where: { id: link.documentId },
      select: { ownerId: true },
    });

    if (doc && doc.ownerId === user.id) {
      // Owner doesn't need a share
      return NextResponse.json({ documentId: link.documentId });
    }

    await prisma.documentShare.create({
      data: {
        documentId: link.documentId,
        userId: user.id,
        role: link.role,
      },
    });
  }

  return NextResponse.json({ documentId: link.documentId });
}
