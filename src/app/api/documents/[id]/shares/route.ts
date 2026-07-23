import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canShare } from "@/lib/permissions";

const shareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
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
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shares = await prisma.documentShare.findMany({
    where: { documentId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(shares);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getAccess(user.id, id);
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, role } = parsed.data;

  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found with that email" },
      { status: 404 }
    );
  }

  if (targetUser.id === user.id) {
    return NextResponse.json(
      { error: "Cannot share with yourself" },
      { status: 400 }
    );
  }

  const share = await prisma.documentShare.upsert({
    where: {
      documentId_userId: { documentId: id, userId: targetUser.id },
    },
    update: { role },
    create: {
      documentId: id,
      userId: targetUser.id,
      role,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(share, { status: 201 });
}
