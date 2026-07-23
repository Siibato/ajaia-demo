# Ajaia

- **Live demo:** https://ajaia-demo.vercel.app
- **Code files:** https://drive.google.com/drive/folders/1h-zEU1gjvjP2Sdg4NGjnDiu0WIn9Liiu?usp=sharing

A lightweight, browser-based document editor built with Next.js, Prisma, PostgreSQL, and UploadThing. Create rich-text documents, share them with fine-grained roles, attach files, and import `.txt`, `.md`, and `.docx` files as new documents.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI/Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | NextAuth with Credentials provider |
| ORM | Prisma |
| Database | PostgreSQL 16 (Docker on port `1100`) |
| Editor | Tiptap (ProseMirror) |
| File uploads | UploadThing |

## Architecture

Ajaia is a single-repo Next.js application with a containerized PostgreSQL database. The architecture follows a conventional App Router layout:

```
src/
├── app/
│   ├── api/            # Route handlers (documents, shares, attachments, uploadthing, auth)
│   ├── app/            # Dashboard — document list, create, import
│   ├── auth/           # Sign-in / sign-up pages
│   └── docs/[id]/      # Document editor page
├── components/
│   ├── editor/         # Tiptap editor, toolbar, image upload
│   ├── ui/             # shadcn/ui primitives
│   └── ...             # Attachment panel, comments panel, import button, share dialog
├── lib/
│   ├── auth.ts         # NextAuth configuration (credentials provider + Prisma adapter)
│   ├── permissions.ts  # getAccess() + canEdit/canView/canShare guards
│   └── prisma.ts       # Prisma client singleton
└── proxy.ts            # UploadThing route handler proxy
```

**Request flow:** The browser hits Next.js server components and API routes. Server components fetch documents via Prisma and enforce access through `lib/permissions.ts`. API routes validate input with Zod, check permissions, and persist via Prisma. File uploads flow through UploadThing route handlers (`src/app/api/uploadthing/`) which enforce session and document-level access in their middleware callbacks.

**Data model:** `User` → owns `Document`s → has `DocumentShare`s (per-user, per-role) and `ShareLink`s (token-based). `Attachment`s link uploaded files (inline images or side attachments) to documents. Content is stored as raw ProseMirror JSON in a `Json` column for lossless round-trips.

**Auth:** NextAuth credentials provider with bcrypt-hashed passwords and JWT sessions. `middleware.ts` guards `/app` and `/docs` routes; individual pages call `getAccess` for document-level checks.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine
- An [UploadThing](https://uploadthing.com/) account (free tier is sufficient)

## Setup

1. **Clone the repository and install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the PostgreSQL container:**

   ```bash
   docker compose up -d
   ```

   The database is exposed on `localhost:1100`.

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in your UploadThing credentials:

   ```env
   DATABASE_URL=postgresql://ajaia:ajaia@localhost:1100/ajaia
   NEXTAUTH_SECRET=ajaia-dev-secret-change-in-production
   NEXTAUTH_URL=http://localhost:3000
   UPLOADTHING_SECRET=sk_...
   UPLOADTHING_APP_ID=...
   ```

4. **Sync the database and seed users:**

   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Run the development server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in.

## Seeded Users

| Email | Password | Purpose |
|-------|----------|---------|
| `alice@example.com` | `password` | Primary demo owner |
| `bob@example.com` | `password` | Editor/viewer demo |
| `carol@example.com` | `password` | Commenter/viewer demo |
| `dave@example.com` | `password` | Extra share target |

## Feature Walkthrough

- **Documents:** Click "New document" from the dashboard to create a document. The editor supports bold, italic, underline, headings, bullet/numbered lists, and inline images.
- **Sharing:** Owners can share documents with other seeded users or create share links. Roles are Viewer, Commenter, and Editor.
- **Inline images:** Paste, drag-and-drop, or click the image button in the toolbar. Images are uploaded to UploadThing and stored in the document content.
- **Side attachments:** Use the Files tab in the right panel to upload and download files alongside a document.
- **Import:** Click "Import document" and choose a `.txt`, `.md`, or `.docx` file. The file is converted to Tiptap JSON and a new document is created.

## File Upload Limits

| Workflow | Accepted Types | Max Size |
|----------|----------------|----------|
| Inline image | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | 4 MB |
| Side attachment | Any MIME type | 8 MB |
| Import new document | `.txt`, `.md`, `.docx` | 8 MB |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm db:push` | Push Prisma schema changes to the database |
| `pnpm db:seed` | Seed the database with demo users |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm lint` | Run ESLint |

## Known Tradeoffs

- **UploadThing for file storage:** UploadThing handles file hosting and CDN URLs, eliminating the need for S3/MinIO. Requires `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`.
- **Credentials auth:** The demo uses a credentials provider with seeded users. No OAuth or email setup is required.
- **Tiptap JSON persistence:** Content is stored as ProseMirror JSON for lossless round-trip formatting.
- **Single active share link per document:** Creating a new link revokes the previous one, but previously redeemed users keep their access.
- **Comments are future work:** The schema and UI have seams for comments but they are not implemented in this phase.

## AI Workflow Note

This project was built with an AI-assisted development workflow. The approach was iterative and deliberate, using a capable LLM as a planning and implementation partner rather than a blind code generator:

1. **Planning & spec generation:** I provided the AI with the full product vision, constraints, and desired feature set. I suggested tools and technologies, and the AI helped evaluate them. We went back and forth — I pushed back on suggestions, the AI challenged my assumptions, and together we converged on a coherent technical spec (`docs/SPEC.md`).

2. **Phase breakdown:** The spec was decomposed into implementation phases (`docs/IMPLEMENTATION_PHASES.md`), each producing a working increment with clear exit criteria.

3. **Per-phase AI agent plans:** For each phase, I created a separate, focused AI agent plan with concrete steps. The agent implemented one phase at a time.

4. **Testing & review per phase:** After each phase was implemented, I thoroughly tested the result — verifying exit criteria, checking edge cases, and reviewing the generated code. I suggested fixes, the agent applied them, and we iterated until the phase was complete, working, and I was comfortable moving on.

5. **Repeat until done:** Phases 0 through 5 were completed sequentially using this loop. No phase was skipped or merged — each was independently verified before proceeding.
