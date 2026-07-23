import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canView } from "@/lib/permissions";

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

  const attachments = await prisma.attachment.findMany({
    where: {
      documentId: id,
      kind: "SIDE_ATTACHMENT",
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}
