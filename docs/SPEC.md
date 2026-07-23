# Ajaia — Technical Specification

## 1. Product Overview

Ajaia is a lightweight, browser-based document editor built on Next.js, Prisma, and PostgreSQL. It supports authenticated document creation, rich-text editing, file import/upload, and a sharing model with fine-grained access control. The implementation deliberately targets a small, coherent surface: documents that feel like Google Docs in their editing flow, side attachments that keep supporting files alongside a document, and a sharing system that can be demonstrated end-to-end with seeded accounts.

The editor uses **Tiptap** (a ProseMirror wrapper) for structured, JSON-backed rich text. Persistence is handled by **Prisma + PostgreSQL**. Authentication is handled by **NextAuth** with a credentials provider backed by Prisma. A local Docker container exposes PostgreSQL on a project-specific port to avoid conflicts with other local databases.

---

## 2. Goals and Non-Goals

### Goals

- Create, rename, edit, save, and reopen rich-text documents in the browser.
- Provide a polished toolbar for bold, italic, underline, headings, bulleted lists, and numbered lists.
- Persist documents across refreshes, preserving formatting and structure.
- Support file upload as a product-relevant workflow: inline images, side attachments, and importing `.txt`, `.md`, and `.docx` files as new documents.
- Implement sharing with a clear owner model, three roles (Viewer, Commenter, Editor), and both direct-user and link-based sharing.
- Demonstrate shared access behavior with seeded users and a credentials-based login flow.
- Leave architectural seams for a future comment-on-selection feature without requiring current schema migration.

### Non-Goals

- Real-time collaborative editing (operational transforms / WebSockets).
- Enterprise-grade access control (no SAML, SCIM, or domain-level policies).
- Self-managed blob storage like S3; UploadThing handles file storage and serving for the demo.
- Email or OAuth-based authentication; credentials provider with seeded users keeps scope contained.
- Full comment implementation; only the data and editor seams are designed now.

---

## 3. Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 16 (App Router) | Server components, API routes, and React 19 in one codebase. |
| UI/Styling | Tailwind CSS 4 + shadcn/ui | Rapid, consistent UI primitives (dialogs, dropdowns, toasts, buttons). |
| Auth | NextAuth with Credentials provider + Prisma adapter | Self-contained, no external identity provider required. |
| ORM | Prisma | Type-safe schema, migrations, and generated client. |
| Database | PostgreSQL 16 in Docker | Port `1100` reserved for this project to avoid conflicts. |
| Editor | Tiptap (ProseMirror) + StarterKit + Underline + Image | JSON-first, extensible, robust selection/transaction handling. |
| Markdown import | `marked` | Convert Markdown to HTML, then to Tiptap JSON. |
| DOCX import | `mammoth` | Convert `.docx` to clean HTML, then to Tiptap JSON. |
| Icons | Lucide React | Consistent, lightweight iconography. |
| Validation | Zod | Type-safe API input validation. |
| File uploads | UploadThing | Managed file upload, storage, and serving with type-safe route handlers and access control. |

---

## 4. Database Architecture

### 4.1 PostgreSQL Container

A `docker-compose.yml` file defines a single PostgreSQL service:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: ajaia-db
    ports:
      - "1100:5432"
    environment:
      POSTGRES_USER: ajaia
      POSTGRES_PASSWORD: ajaia
      POSTGRES_DB: ajaia
    volumes:
      - ajaia_pg_data:/var/lib/postgresql/data

volumes:
  ajaia_pg_data:
```

The host connection string is:

```
DATABASE_URL=postgresql://ajaia:ajaia@localhost:1100/ajaia
```

Port `1100` is chosen because it is unlikely to collide with common local Postgres (`5432`) or other project databases, and it is easy to remember for this repository.

### 4.2 Prisma Schema

The schema is intentionally small. Comment-related tables are reserved as additive future work; they do not need to exist for the current implementation.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String          @id @default(cuid())
  email         String          @unique
  name          String?
  passwordHash  String
  documents     Document[]      @relation("OwnedDocuments")
  shares        DocumentShare[] @relation("SharedWithUser")
  createdAt     DateTime        @default(now())

  // Future comments
  // comments      Comment[]
}

enum Role {
  VIEWER
  COMMENTER
  EDITOR
}

model Document {
  id        String          @id @default(cuid())
  title     String          @default("Untitled")
  content   Json            // Tiptap ProseMirror document
  ownerId   String
  owner     User            @relation("OwnedDocuments", fields: [ownerId], references: [id], onDelete: Cascade)
  shares    DocumentShare[]
  attachments Attachment[]
  shareLinks ShareLink[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([ownerId])
}

model DocumentShare {
  id         String   @id @default(cuid())
  documentId String
  userId     String
  role       Role
  createdAt  DateTime @default(now())
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User     @relation("SharedWithUser", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([documentId, userId])
  @@index([userId])
}

enum AttachmentKind {
  INLINE_IMAGE
  SIDE_ATTACHMENT
}

model Attachment {
  id          String         @id @default(cuid())
  documentId  String
  document    Document       @relation(fields: [documentId], references: [id], onDelete: Cascade)
  uploaderId  String
  kind        AttachmentKind
  filename    String
  mimeType    String
  sizeBytes   Int
  url         String         // UploadThing URL returned after upload
  fileKey     String         // UploadThing file key for deletion
  createdAt   DateTime       @default(now())

  @@index([documentId])
}

model ShareLink {
  id          String    @id @default(cuid())
  token       String    @unique // URL-safe random token
  documentId  String
  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  role        Role      // role granted when redeemed
  createdById String
  createdAt   DateTime  @default(now())
  expiresAt   DateTime? // null means no expiration
  revokedAt   DateTime? // null means active

  @@index([documentId])
}
```

### 4.3 NextAuth Tables

The Prisma adapter for NextAuth adds `Account`, `Session`, and `VerificationToken` models. These are standard adapter tables and do not affect the credentials flow.

---

## 5. Authentication

### 5.1 Credentials Provider

NextAuth uses a single `credentials` provider. The `authorize` callback hashes the supplied password with bcrypt and returns the user's `id`, `email`, and `name`. JWT sessions carry `user.id` so server components can call `getAccess`. No OAuth or SMTP is required.

### 5.2 Seeded Users

A `prisma/seed.ts` script creates a fixed set of users. This lets reviewers immediately demonstrate sharing without setting up accounts.

| Email | Name | Password | Purpose |
|-------|------|----------|---------|
| `alice@example.com` | Alice | `password` | Primary demo owner |
| `bob@example.com` | Bob | `password` | Editor/viewer demo |
| `carol@example.com` | Carol | `password` | Commenter/viewer demo |
| `dave@example.com` | Dave | `password` | Extra share target |

Seed command: `pnpm db:seed` or `npx prisma db seed`.

### 5.3 Protected Routes

A `middleware.ts` guards `/app` and `/docs` routes, redirecting unauthenticated users to `/auth/signin`. Individual pages still call `getAccess` for document-level checks.

---

## 6. Rich-Text Editor

### 6.1 Why Tiptap

Tiptap exposes ProseMirror's transaction engine through a React-friendly API. Its JSON document model is a natural fit for database storage, and its mark/node abstraction makes future features (inline images, comments, embedded mentions) straightforward. Compared to Slate or Lexical, Tiptap has the lowest boilerplate for the feature set listed here and the most battle-tested list/heading extensions.

### 6.2 Extensions

The editor loads `StarterKit` (bold, italic, headings 1–3, bullet/ordered lists, paragraph, history) plus `Underline` and `Image`. `useEditor` is configured with `editable: canEdit(access)` and `immediatelyRender: false` to avoid Next.js hydration mismatches.

### 6.3 Toolbar Actions

The toolbar is a custom shadcn button row wired to `editor.chain().focus().toggle{Bold,Italic,Underline,Heading,BulletList,OrderedList}().run()`. Active states come from `editor.isActive(...)`.

### 6.4 Persistence Model

The document content is stored as the raw ProseMirror JSON in a `Json` column. This is lossless: every node, mark, heading level, list, and inline image reference survives round trips through the database.

JSON avoids HTML sanitization, preserves heading/list structure exactly, and lets read-only views render the same document with `editable={false}`. Imports convert source files to HTML, then call `generateJSON(html, [StarterKit, Underline, Image])`.

### 6.5 Saving Strategy

Three save mechanisms are exposed to the user:

1. **Autosave**: debounced `onUpdate` handler, ~800ms after the user stops typing. Sends `PATCH /api/documents/:id` with `{ title, content }`.
2. **Manual save**: `Ctrl/Cmd+S` is wired to save immediately and show a toast/status update.
3. **Status indicator**: a small text label near the toolbar shows `"Saved"`, `"Saving..."`, `"Unsaved changes"`, or `"Saved 3s ago"`.

The save request validates `{ title?, content }` with Zod before updating the `Document` row.

### 6.6 Title Editing

The title is an inline input at the top of the document page. It saves on `blur` and on `Enter`. The default value is `"Untitled"`. A rename action in the sidebar also redirects to the same page where the title can be edited.

---

## 7. File Upload and Import

### 7.1 Supported File Types

| Workflow | Accepted Types | Max Size | Destination |
|----------|----------------|----------|-------------|
| Inline image | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | 5 MB | Inside `Document.content` as an image node |
| Side attachment | Any MIME type | 10 MB | `Attachment` table, listed in side panel |
| Import new document | `.txt`, `.md`, `.docx` | 10 MB | New `Document` row with converted Tiptap JSON |

These limits are enforced in the UI via `accept` attributes and on the server via MIME sniff and size checks. If a user uploads an unsupported type, a clear error toast is shown.

### 7.2 Storage: UploadThing

File uploads are handled by **UploadThing**, a managed file upload service that provides type-safe route handlers, automatic storage, and CDN-served URLs. This eliminates the need for local filesystem management or self-hosted S3/MinIO.

UploadThing route handlers are defined in `app/api/uploadthing/core.ts` and `app/api/uploadthing/route.ts`. Each upload route specifies allowed MIME types, max file size, and a callback that runs after the upload completes. The callback receives the uploaded file metadata (URL, key, name, size, type) and is used to insert an `Attachment` row in the database.

Access control is enforced inside the UploadThing middleware callback: the session is checked, and `canEdit`/`canComment`/`canView` guards are applied based on the upload type and the target document. This prevents unauthenticated or unauthorized uploads.

Files are served directly from UploadThing's CDN using the returned URL. No custom file-streaming endpoint is needed. Deletion is handled via the UploadThing SDK's `deleteFiles` function, which removes both the remote file and the local `Attachment` row.

### 7.3 Inline Images

Inline images upload via the UploadThing route handler configured for image types (`image/png`, `image/jpeg`, `image/gif`, `image/webp`, max 5 MB). The middleware callback validates `canEdit` access on the target document, inserts an `Attachment` row with `kind=INLINE_IMAGE` and the returned UploadThing URL, and returns the URL to the client. The editor inserts an `Image` node with the UploadThing CDN URL, so the image reference lives inside `Document.content` JSON.

### 7.4 Side Attachments

A side panel lists `kind=SIDE_ATTACHMENT` files with filename, size, date, and download/delete buttons. Upload goes through a dedicated UploadThing route handler (any MIME type, max 10 MB) whose middleware validates `canEdit` or `canComment` access. Deletion calls `deleteFiles` from the UploadThing SDK to remove the remote file and then deletes the `Attachment` row; deletion is limited to editors/owners.

### 7.5 Document Import

A "Import file" button on the dashboard creates a new document from a file. The file is uploaded via an UploadThing route handler restricted to `.txt`, `.md`, and `.docx` (max 10 MB). After the upload completes, the middleware callback reads the file content from the UploadThing URL, converts it to Tiptap JSON, and creates a new `Document`:

- `.txt`: split on newlines, wrap each non-empty line in a `paragraph` node.
- `.md`: run `marked` to produce HTML, then `generateJSON(html, extensions)`.
- `.docx`: run `mammoth` with `convertToHtml`, then `generateJSON(html, extensions)`.

After conversion, a new `Document` is created with `ownerId` set to the current user and a title derived from the filename. The user is redirected to `/docs/{id}` for editing. The uploaded source file is deleted from UploadThing after conversion since it is no longer needed.

---

## 8. Sharing Model

### 8.1 Roles

Three roles are implemented from the start. The `COMMENTER` value is meaningful for permissions now (read-only) and becomes active when comments are added later.

| Role | Read | Edit | Share | Comment |
|------|------|------|-------|---------|
| Owner | Yes | Yes | Yes | Yes |
| Editor | Yes | Yes | No | Yes |
| Commenter | Yes | No | No | Yes |
| Viewer | Yes | No | No | No |

Only the owner can share a document. This rule keeps the mental model simple and matches the spec's emphasis on a clear owner.

### 8.2 Permission Resolution

A `getAccess(userId, docId)` helper in `lib/permissions.ts` returns `owner`, `editor`, `commenter`, `viewer`, or `none` by checking ownership and the `DocumentShare` table. Derived guards `canEdit`, `canComment`, `canView`, and `canShare` gate every route, component, and the editor's `editable` prop.

### 8.3 Direct User Sharing

A "Share" dialog lets the owner search by exact email, pick a role, and upsert a `DocumentShare` row. Existing shares can be edited or removed. The route validates `{ documentId, email, role }` with Zod and verifies the requester is the owner.

### 8.4 Share Links

A share link lets an authenticated user redeem access to a document. Links are created by the owner from the same share dialog. Tokens are URL-safe random strings with the format `https://localhost:3000/share/{token}`. On redemption, the server validates the token and upserts a `DocumentShare` row for the visitor with the link's role, never downgrading an existing higher role. Only one active link is kept per document; creating a new one revokes the previous.

---

## 9. Future Commenting Architecture

Comments are not implemented in the current phase, but the schema, permissions, and editor are designed to support them without structural rework.

### 9.1 The Anchor Problem

A comment must anchor to a specific range of text. If a user edits before or inside that range, the anchor must travel with the text. External position coordinates (`{ from, to }`) drift and break as soon as the document is edited. The correct approach is to store the anchor inside the document JSON as a ProseMirror **mark**.

### 9.2 Comment Mark

A future Tiptap `comment` mark with a `threadId` attribute is applied to selected text. Because it is a mark, ProseMirror keeps the anchor in sync with edits. It is configured `inclusive: false` so typing at the edge does not extend the comment.

### 9.3 Comment Tables (future)

Two additive Prisma models: `CommentThread` (linked to `Document`) and `Comment` (linked to `CommentThread` and `User`). No existing tables need to change.

### 9.4 Linkage Between Mark and Thread

The `threadId` attribute on the `comment` mark inside `Document.content` references `CommentThread.id` in the database. The document JSON is the single source of truth for *which text* is commented; the database tables are the source of truth for *the discussion*.

Example: a text node with `marks: [{ "type": "comment", "attrs": { "threadId": "cmt_abc" } }]` flags the exact range. The thread record lives in `CommentThread`.

### 9.5 Future Rendering and Orphans

Tiptap renders the mark as a highlighted span. The UI collects all `threadId`s from the JSON and fetches threads in one request. If the commented text is deleted, the mark disappears but the row remains; a future on-save sweeper can clean orphans.

---

## 10. API Routes

### 10.1 Documents

| Method | Route | Auth | Body/Params | Description |
|--------|-------|------|-------------|-------------|
| POST | `/api/documents` | Yes | `{ title? }` | Create new document, returns `{ id }` |
| GET | `/api/documents` | Yes | — | List owned and shared documents for the sidebar |
| GET | `/api/documents/:id` | Yes | — | Get document metadata + content (checks `canView`) |
| PATCH | `/api/documents/:id` | Yes | `{ title?, content }` | Save title/content (checks `canEdit`) |
| DELETE | `/api/documents/:id` | Yes | — | Delete document (owner only) |

### 10.2 Sharing

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/api/documents/:id/shares` | Yes | `{ email, role }` | Add or update a share (owner only) |
| PATCH | `/api/documents/:id/shares/:userId` | Yes | `{ role }` | Update role (owner only) |
| DELETE | `/api/documents/:id/shares/:userId` | Yes | — | Remove a share (owner only) |
| GET | `/api/documents/:id/shares` | Yes | — | List current shares (owner only) |
| POST | `/api/share-links` | Yes | `{ documentId, role }` | Create or rotate share link |
| DELETE | `/api/share-links/:token` | Yes | — | Revoke share link |
| POST | `/api/share-links/:token/redeem` | Yes | — | Redeem share link |

### 10.3 Attachments

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/api/uploadthing` | Yes | `FormData` (file) | UploadThing route handler for inline images, side attachments, and imports (access control in middleware) |
| GET | `/api/documents/:id/attachments` | Yes | — | List side attachments (checks `canView`) |
| DELETE | `/api/attachments/:id` | Yes | — | Delete attachment via UploadThing SDK + DB row (owner/editor) |

### 10.4 Import

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| POST | `/api/documents/import` | Yes | `{ fileUrl, fileName }` | Convert uploaded `.txt/.md/.docx` to new document |

### 10.5 Comments (future, reserved)

| Method | Route | Auth | Body | Description |
|--------|-------|------|------|-------------|
| GET | `/api/documents/:id/comments` | Yes | `?threadIds=...` | Fetch comment threads |
| POST | `/api/documents/:id/comments` | Yes | `{ threadId?, body, from?, to? }` | Add a comment or create a new thread |
| DELETE | `/api/comments/:id` | Yes | — | Delete a comment |

---

## 11. UI/UX Structure

### 11.1 Dashboard (`/app`)

- **Left sidebar**: two visible sections, always present.
  - **Owned Documents**: created by the current user, each row shows title and last updated time.
  - **Shared with Me**: documents shared by others, each row shows title, owner name, and role badge (`Editor`, `Commenter`, `Viewer`).
- **Top bar**: product name, current user name, sign-out button.
- **Main area**: empty state with "New document" and "Import document" buttons.
- **Create flow**: "New document" creates a doc and redirects to `/docs/{id}`. "Import document" opens a file picker filtered to `.txt`, `.md`, `.docx`.

### 11.2 Document Editor (`/docs/[id]`)

- **Header**: back to dashboard, editable title input, save status, share button (owner only).
- **Toolbar**: bold, italic, underline, heading dropdown, paragraph, bullet list, numbered list, image upload, undo/redo.
- **Editor surface**: large white canvas with drop/paste image support.
- **Side panel**: tabs for "Attachments" (side attachments list + upload) and future "Comments".
- **Share dialog**: tab or section for direct user shares, current share list, and share link generation/revocation/copy.

### 11.3 Authentication Pages

- `/auth/signin` — email/password sign-in form.
- `/auth/signup` — optional; can also be disabled and replaced by the seed script for reviewers.

### 11.4 Share Link Page (`/share/[token]`)

- Server-side redemption: if valid, upsert share and redirect to the document.
- If invalid, revoked, expired, or user not signed in, show an error page with a sign-in link.

---

## 12. Persistence Guarantees

The spec requires documents and sharing data to remain after refresh and preserve formatting. The following design decisions satisfy that:

- **Content stored as JSON**: every formatting mark, heading level, list structure, and inline image reference is preserved exactly.
- **Server-rendered reads**: `GET /api/documents/:id` returns the full JSON from the `Json` column. The client Tiptap editor reconstructs the identical document tree.
- **Single save source**: all writes go through `PATCH /api/documents/:id` with the same JSON schema.
- **Shares are rows, not UI state**: a share remains in `DocumentShare` until deleted by the owner, surviving refreshes and server restarts.
- **Files are durable in UploadThing**: uploaded files persist in UploadThing's managed storage. The `Attachment` table links document IDs to UploadThing URLs and file keys so references are restored after restart.

---

## 13. Security and Access Control Checklist

- All document reads check `canView`.
- All document writes check `canEdit`.
- All share mutations check `canShare` (owner only).
- Share links require authentication to redeem.
- File downloads check `canView` of the parent document.
- Credentials passwords are hashed with bcrypt.
- NextAuth session strategy is JWT for server components.
- Zod validates every API body and query parameter.
- Prisma `onDelete: Cascade` prevents orphaned shares, attachments, and links when a document or user is removed.

---

## 14. Implementation Phases

| Phase | Focus |
|-------|-------|
| 0. Foundation | PostgreSQL on port `1100`, dependencies, Prisma schema, `.env`, `pnpm db:push` |
| 1. Auth + Shell | NextAuth credentials, seeded users, sign-in page, `middleware.ts`, empty sidebar layout |
| 2. Editor | Document creation, `/docs/[id]` with Tiptap, toolbar, title, autosave, save status |
| 3. Sharing | `getAccess` helper, share dialog, share links, role enforcement, sidebar badges |
| 4. Uploads | UploadThing integration, inline images, side-attachment panel, `.txt/.md/.docx` import |
| 5. Polish | Empty states, toasts, keyboard shortcuts, README, end-to-end QA |
| 6. Comments (future) | `CommentThread`/`Comment` tables, `comment` mark, selection popover, orphan sweep |

---

## 15. Known Tradeoffs and Decisions

- **UploadThing for file storage**: managed upload service eliminates local filesystem and S3/MinIO dependencies. Requires `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` env vars. Free tier is sufficient for the demo.
- **Credentials auth**: no external identity provider; seeded users make sharing demonstrable.
- **Tiptap JSON persistence**: more reliable than HTML for round-trip formatting; requires `Json` column.
- **Single active share link per document**: prevents link sprawl; revoking one does not affect previously redeemed users.
- **Comment mark anchoring**: stores anchors inside the document JSON, not the database, to survive edits. Future cleanup needed for orphan threads.
- **No orphan cleanup in current phase**: deleting inline images or commented text may leave `Attachment` or `CommentThread` rows. Acceptable for the demo; documented.
- **Docker Postgres only**: Next.js runs on the host for fast HMR; only the database is containerized.

