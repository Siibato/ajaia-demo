import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canShare } from "@/lib/permissions";

const updateSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const access = await getAccess(user.id, id);
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const share = await prisma.documentShare.update({
    where: { documentId_userId: { documentId: id, userId } },
    data: { role: parsed.data.role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(share);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const access = await getAccess(user.id, id);
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.documentShare.delete({
    where: { documentId_userId: { documentId: id, userId } },
  });

  return NextResponse.json({ success: true });
}
