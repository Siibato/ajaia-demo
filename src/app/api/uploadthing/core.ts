import { z } from "zod";
import { f } from "@/lib/uploadthing";

export const ourRouter = {
  sideAttachment: f({ blob: { maxFileSize: "16MB", maxFileCount: 5 } })
    .input(z.object({ documentId: z.string() }))
    .middleware(async ({ input }) => {
      const { getSessionUser } = await import("@/lib/session");
      const user = await getSessionUser();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.id, documentId: input.documentId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { prisma } = await import("@/lib/prisma");
      await prisma.attachment.create({
        data: {
          documentId: metadata.documentId,
          uploaderId: metadata.userId,
          kind: "SIDE_ATTACHMENT",
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          url: file.url,
          fileKey: file.key,
        },
      });
      return { url: file.url };
    }),

  inlineImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { getSessionUser } = await import("@/lib/session");
      const user = await getSessionUser();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { prisma } = await import("@/lib/prisma");
      const docId = (metadata as { documentId?: string }).documentId;
      if (docId) {
        await prisma.attachment.create({
          data: {
            documentId: docId,
            uploaderId: (metadata as { userId: string }).userId,
            kind: "INLINE_IMAGE",
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            url: file.url,
            fileKey: file.key,
          },
        });
      }
      return { url: file.url };
    }),
};

export type OurRouter = typeof ourRouter;
