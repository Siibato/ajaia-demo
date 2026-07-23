import { prisma } from "@/lib/prisma";

export type AccessLevel = "owner" | "editor" | "commenter" | "viewer" | "none";

export async function getAccess(
  userId: string,
  docId: string
): Promise<AccessLevel> {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { ownerId: true },
  });

  if (!doc) return "none";

  if (doc.ownerId === userId) return "owner";

  const share = await prisma.documentShare.findUnique({
    where: {
      documentId_userId: { documentId: docId, userId },
    },
    select: { role: true },
  });

  if (!share) return "none";

  switch (share.role) {
    case "EDITOR":
      return "editor";
    case "COMMENTER":
      return "commenter";
    case "VIEWER":
      return "viewer";
    default:
      return "none";
  }
}

export function canView(access: AccessLevel): boolean {
  return access !== "none";
}

export function canEdit(access: AccessLevel): boolean {
  return access === "owner" || access === "editor";
}

export function canComment(access: AccessLevel): boolean {
  return access === "owner" || access === "editor" || access === "commenter";
}

export function canShare(access: AccessLevel): boolean {
  return access === "owner";
}
