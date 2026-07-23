import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAccess, canView, canComment } from "@/lib/permissions";

const postSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(5000),
  from: z.number().int().optional(),
  to: z.number().int().optional(),
});

export async function GET(
  req: Request,
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

  const url = new URL(req.url);
  const threadIdsParam = url.searchParams.get("threadIds");
  const threadIds = threadIdsParam
    ? threadIdsParam.split(",").filter(Boolean)
    : null;

  const threads = await prisma.commentThread.findMany({
    where: {
      documentId: id,
      deletedAt: null,
      ...(threadIds ? { id: { in: threadIds } } : {}),
    },
    include: {
      comments: {
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    threads.map((t) => ({
      id: t.id,
      from: t.from,
      to: t.to,
      deletedAt: t.deletedAt,
      createdAt: t.createdAt,
      createdBy: t.createdBy,
      comments: t.comments.map((c) => ({
        id: c.id,
        body: c.body,
        authorId: c.authorId,
        authorName: c.author.name,
        createdAt: c.createdAt,
      })),
    }))
  );
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
  if (!canComment(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { threadId, body: commentBody, from, to } = parsed.data;

  const existing = await prisma.commentThread.findUnique({
    where: { id: threadId },
    select: { id: true, deletedAt: true, documentId: true },
  });

  if (existing && existing.documentId !== id) {
    return NextResponse.json({ error: "Thread does not belong to this document" }, { status: 400 });
  }

  if (existing && existing.deletedAt) {
    return NextResponse.json({ error: "Thread is deleted" }, { status: 410 });
  }

  if (!existing) {
    await prisma.commentThread.create({
      data: {
        id: threadId,
        documentId: id,
        createdById: user.id,
        from: from ?? null,
        to: to ?? null,
        comments: {
          create: {
            authorId: user.id,
            body: commentBody,
          },
        },
      },
    });
  } else {
    await prisma.comment.create({
      data: {
        threadId,
        authorId: user.id,
        body: commentBody,
      },
    });
  }

  return NextResponse.json({ threadId, success: true });
}
