# Ajaia — Implementation Phases

This document expands the high-level phases from `SPEC.md` into concrete, actionable steps. Each phase produces a working increment and ends with clear exit criteria.

---

## Phase 0 — Foundation

### Goal
A runnable Next.js project connected to a PostgreSQL container on port `1100`, with Prisma schema synced to the database and all required dependencies installed.

### Steps
1. Add `docker-compose.yml` with a PostgreSQL service exposing port `1100`.
2. Run `docker compose up -d` to start the database.
3. Install dependencies:
   - `prisma`, `@prisma/client`
   - `next-auth`, `@auth/prisma-adapter`
   - `bcrypt`, `zod`
   - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-image`
   - `marked`, `mammoth`
   - `lucide-react`
   - `uploadthing`, `@uploadthing/react`
   - Initialize shadcn/ui
4. Create `.env` and `.env.example` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `UPLOADTHING_SECRET`, and `UPLOADTHING_APP_ID`.
5. Write `prisma/schema.prisma` with `User`, `Document`, `DocumentShare`, `Attachment`, `ShareLink`, and NextAuth adapter models.
6. Run `pnpm db:push` to sync the schema.
7. Verify `pnpm dev` starts without errors and the landing page loads.

### Exit Criteria
- `docker ps` shows the `ajaia-db` container.
- `pnpm db:push` completes without errors.
- `pnpm dev` renders the default Next.js page at `http://localhost:3000`.

---

## Phase 1 — Authentication and Shell

### Goal
Users can sign in with credentials, seeded accounts exist, and protected routes redirect unauthenticated users to sign in.

### Steps
1. Configure `app/api/auth/[...nextauth]/route.ts` with the credentials provider and Prisma adapter.
2. Add JWT callbacks so `session.user.id` is available to server components.
3. Create `prisma/seed.ts` to insert `alice`, `bob`, `carol`, `dave` with bcrypt-hashed passwords.
4. Add `prisma.seed` config in `package.json` and run `pnpm db:seed`.
5. Build `/auth/signin` page with email/password form and error handling.
6. Add `middleware.ts` to protect `/app/:path*` and `/docs/:path*`.
7. Create the dashboard layout at `/app/page.tsx` with an empty sidebar containing two sections: "Owned Documents" and "Shared with Me".
8. Add a top bar with current user name and a sign-out button.

### Exit Criteria
- You can sign in as `alice@example.com` / `password`.
- Unauthenticated access to `/app` redirects to `/auth/signin`.
- The dashboard sidebar renders with both empty sections.
- Sign out works and returns to the sign-in page.

---

## Phase 2 — Document Editor

### Goal
Users can create, edit, save, and delete rich-text documents with a usable toolbar.

### Steps
1. Add `lib/prisma.ts` singleton client.
2. Implement `POST /api/documents` to create a new empty document and return `{ id }`.
3. Implement `GET /api/documents` to list owned documents.
4. Build `/app/page.tsx` so the "Owned Documents" list populates and "New document" works.
5. Build `/docs/[id]/page.tsx`:
   - Fetch the document server-side with `canView` check.
   - Render an editable title input.
   - Render the Tiptap editor with `StarterKit`, `Underline`, and `Image`.
   - Pass `editable={canEdit(access)}` so viewers get a read-only editor.
6. Build the toolbar component with buttons for bold, italic, underline, heading 1/2/3, paragraph, bullet list, numbered list, undo, redo, and image insert.
7. Implement `PATCH /api/documents/:id` with Zod validation and `canEdit` guard.
8. Wire autosave with `useEditor.onUpdate` debounced to ~800ms.
9. Add manual save on `Ctrl/Cmd+S` and a status label (Saved / Saving / Unsaved / Saved 3s ago).
10. Add title save on `blur` and `Enter`.
11. Implement `DELETE /api/documents/:id` (owner only) and a delete action in the UI.

### Exit Criteria
- Alice creates a document, types formatted text, and the "Saved" status appears.
- Refreshing `/docs/[id]` restores the exact same content and formatting.
- Viewer sees the same content but cannot edit.
- Deleting a document removes it from the "Owned" list.

---

## Phase 3 — Sharing

### Goal
Document owners can share with other seeded users, share links work, and the sidebar clearly distinguishes owned and shared documents.

### Steps
1. Implement `lib/permissions.ts` with `getAccess` and guard helpers.
2. Update `GET /api/documents` to return both owned documents and documents shared with the current user, including owner names and roles.
3. Build the "Shared with Me" sidebar section with role badges.
4. Build a Share dialog on `/docs/[id]`:
   - Input for exact recipient email.
   - Role dropdown: Viewer, Commenter, Editor.
   - List current shares with update/remove actions.
   - Section to create, copy, and revoke a share link.
5. Implement `POST /api/documents/:id/shares` (owner only).
6. Implement `PATCH /api/documents/:id/shares/:userId` (owner only).
7. Implement `DELETE /api/documents/:id/shares/:userId` (owner only).
8. Implement `GET /api/documents/:id/shares` (owner only).
9. Implement `POST /api/share-links` to create or rotate a share link.
10. Implement `DELETE /api/share-links/:token` to revoke a share link.
11. Implement `POST /api/share-links/:token/redeem` and `/share/[token]` page to validate and redirect.
12. Ensure `canEdit(access)` is enforced in the editor and `canShare` is enforced in the UI.

### Exit Criteria
- Alice shares a document with Bob as Editor.
- Bob sees the document under "Shared with Me" with an "Editor" badge.
- Bob can edit and save the shared document.
- Alice sees Bob in the share list and can remove or downgrade him.
- A share link grants the selected role when redeemed by Carol.
- Revoking a link blocks new redemptions but does not remove existing shares.

---

## Phase 4 — Uploads and Import

### Goal
Users can attach files, insert inline images, and import `.txt`, `.md`, and `.docx` files as new documents using UploadThing.

### Steps
1. Install and configure UploadThing:
   - Add `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` to `.env`.
   - Create `app/api/uploadthing/core.ts` with route handler definitions.
   - Create `app/api/uploadthing/route.ts` to expose the UploadThing endpoints.
2. Define UploadThing upload routes:
   - `inlineImage`: accepts `image/png`, `image/jpeg`, `image/gif`, `image/webp`, max 5 MB. Middleware validates session and `canEdit` on the target document. On upload complete, insert an `Attachment` row with `kind=INLINE_IMAGE`, `url`, and `fileKey`.
   - `sideAttachment`: accepts any MIME type, max 10 MB. Middleware validates `canEdit` or `canComment`. On upload complete, insert an `Attachment` row with `kind=SIDE_ATTACHMENT`.
   - `importFile`: accepts `.txt`, `.md`, `.docx`, max 10 MB. Middleware validates session. On upload complete, fetch the file content from the UploadThing URL, convert to Tiptap JSON, create a new `Document`, and delete the source file from UploadThing.
3. Implement `GET /api/documents/:id/attachments` to list side attachments (checks `canView`).
4. Implement `DELETE /api/attachments/:id`:
   - Validate owner/editor access.
   - Call `deleteFiles` from the UploadThing SDK with the attachment's `fileKey`.
   - Delete the `Attachment` row.
5. Wire Tiptap `Image` extension to handle paste/drop/upload using UploadThing's `useUploadThing` hook and insert `src` with the returned UploadThing CDN URL.
6. Build the side attachment panel with upload (via `useUploadThing`), download (link to UploadThing URL), and delete buttons.
7. Add an "Import document" button on the dashboard that triggers the `importFile` UploadThing route, then redirects to `/docs/{id}` on success.

### Exit Criteria
- Alice pastes an image into a document; it renders after refresh and is visible to Bob when shared.
- Alice uploads a PDF as a side attachment; Bob can download it.
- Alice imports a `.docx` file and is redirected to a new editable document.
- Uploading a 20MB file or a `.exe` file shows a clear validation error.

---

## Phase 5 — Polish and Documentation

### Goal
The application is presentable, documented, and free of obvious paper cuts.

### Steps
1. Add empty states for the dashboard and attachment panel.
2. Add loading skeletons for document lists and the editor.
3. Add success/error toasts for save, share, upload, delete, and import actions.
4. Polish keyboard shortcuts: `Cmd/Ctrl+S` manual save, `Cmd/Ctrl+B/I/U` already handled by Tiptap.
5. Add subtle focus and active states to toolbar buttons.
6. Write `README.md` with setup, seeded users, feature walkthrough, file limits, and known tradeoffs.
7. Perform a manual end-to-end QA script:
   - Create → edit → refresh.
   - Share with user and share link.
   - Switch accounts and verify read/edit permissions.
   - Upload inline image and side attachment.
   - Import `.txt`, `.md`, `.docx`.
   - Delete document and verify cleanup.

### Exit Criteria
- The README is complete enough for another developer to run the project in minutes.
- All seeded user flows produce the expected results.
- No unhandled errors or console warnings during the QA walkthrough.

---

## Phase 6 — Comments (Future)

### Goal
Add a fully functional comment-on-selection feature without changing existing tables.

### Steps
1. Add `CommentThread` and `Comment` tables to `prisma/schema.prisma` and run a migration.
2. Create a Tiptap `Comment` mark with a `threadId` attribute, configured `inclusive: false`.
3. Add a "Comment" button to the toolbar that creates a thread from the current selection.
4. Implement `POST /api/documents/:id/comments` to create or reply to a thread.
5. Implement `GET /api/documents/:id/comments?threadIds=...` to fetch threads.
6. Implement `DELETE /api/comments/:id` for authors.
7. Build a comments sidebar panel showing threads for the current document.
8. Highlight commented text and open the relevant thread on click.
9. Add an on-save sweeper that removes `CommentThread` rows whose `threadId` no longer appears in the document JSON.

### Exit Criteria
- A user can select text, add a comment, and another user can see it.
- Editing the document preserves the comment anchor on the intended text range.
- Deleting all commented text removes the highlight and eventually the orphan thread.
