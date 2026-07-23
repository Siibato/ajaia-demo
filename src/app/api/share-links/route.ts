import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canShare } from "@/lib/permissions";

const createLinkSchema = z.object({
  documentId: z.string(),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { documentId, role } = parsed.data;

  const access = await getAccess(user.id, documentId);
  if (!canShare(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Revoke any existing active link for this document
  await prisma.shareLink.updateMany({
    where: {
      documentId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const token = randomBytes(24).toString("hex");

  const link = await prisma.shareLink.create({
    data: {
      token,
      documentId,
      role,
      createdById: user.id,
    },
  });

  return NextResponse.json({ token: link.token }, { status: 201 });
}
