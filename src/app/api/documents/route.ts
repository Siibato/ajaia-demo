import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const doc = await prisma.document.create({
    data: {
      title: parsed.data.title ?? "Untitled",
      content: "",
      ownerId: user.id,
    },
  });

  return NextResponse.json({ id: doc.id }, { status: 201 });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [owned, sharedShares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true,
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ]);

  const shared = sharedShares.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt,
    createdAt: s.document.createdAt,
    owner: s.document.owner,
    role: s.role,
  }));

  return NextResponse.json({ owned, shared });
}
