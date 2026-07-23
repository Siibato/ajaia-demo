import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export default async function ShareLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getSessionUser();

  const link = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!link) {
    return <ErrorState message="This share link does not exist." />;
  }

  if (link.revokedAt) {
    return <ErrorState message="This share link has been revoked." />;
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return <ErrorState message="This share link has expired." />;
  }

  if (!user) {
    return (
      <ErrorState
        message="Please sign in to access this document."
        showSignIn
        signInHref={`/auth/signin?callbackUrl=/share/${link.token}`}
      />
    );
  }

  // Check if user already has access
  const existing = await prisma.documentShare.findUnique({
    where: {
      documentId_userId: { documentId: link.documentId, userId: user.id },
    },
  });

  const roleRank = { VIEWER: 0, COMMENTER: 1, EDITOR: 2 };

  if (!existing) {
    // Check if user is the owner
    const doc = await prisma.document.findUnique({
      where: { id: link.documentId },
      select: { ownerId: true },
    });

    if (doc && doc.ownerId === user.id) {
      redirect(`/docs/${link.documentId}`);
    }

    // Create share
    await prisma.documentShare.create({
      data: {
        documentId: link.documentId,
        userId: user.id,
        role: link.role,
      },
    });
  } else if (roleRank[existing.role] < roleRank[link.role]) {
    // Upgrade role
    await prisma.documentShare.update({
      where: { id: existing.id },
      data: { role: link.role },
    });
  }

  redirect(`/docs/${link.documentId}`);
}

function ErrorState({
  message,
  showSignIn = false,
  signInHref = "/auth/signin",
}: {
  message: string;
  showSignIn?: boolean;
  signInHref?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
            <FileText className="size-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            Ajaia
          </h1>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-600">{message}</p>
          {showSignIn && (
            <Link
              href={signInHref}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
