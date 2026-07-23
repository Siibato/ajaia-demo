# UI Style Guide — Repa's Board Reviewer

A reference for replicating the minimal, monochrome-stone interface of the exam reviewer app.

## 1. Tech Stack

- **Framework:** Next.js 14 App Router + React 18 + TypeScript
- **Styling:** Tailwind CSS 3.4
- **Components:** shadcn/ui configured for `radix-nova` style, `neutral` base color
- **Icons:** Lucide React
- **Font:** Vercel `Geist Sans` loaded via `next/font/local`

## 2. Design Tokens

### 2.1 Color Palette

Use these Tailwind classes throughout the UI.

| Token | Tailwind | Usage |
|-------|----------|-------|
| Page background | `bg-zinc-50` | `body`, root wrapper |
| Surface / card | `bg-white` | cards, dialogs, elevated panels |
| Primary text | `text-black` | headings, question text |
| Secondary text | `text-zinc-500` | labels, meta, helper text |
| Muted text | `text-zinc-400` | disabled, wrong answers |
| Primary accent | `bg-black text-white` | primary buttons, selected states |
| Secondary fill | `bg-zinc-100` | hover states, rationale boxes |
| Tertiary border | `border-zinc-200` | card borders, inputs, dividers |
| Focus ring | `border-zinc-500` | focused inputs |
| Error | `bg-red-50 border-red-200 text-red-700` | error banners |
| Warning | `bg-amber-50 border-amber-200 text-amber-800` | fallback notices |
| Correct | `border-black bg-zinc-100` | correct answer highlight |
| Wrong | `border-zinc-300 text-zinc-400 line-through` | wrong answer |
| Selected | `border-blue-400 bg-blue-50` | user-selected choice |

### 2.2 Radius Tokens

| Element | Radius | Tailwind |
|---------|--------|----------|
| Page cards / sections | `16px` | `rounded-2xl` |
| Buttons | `12px` | `rounded-xl` |
| Inputs / selects / textareas | `12px` | `rounded-xl` |
| Badges / chips | `9999px` | `rounded-full` |
| Segmented control | `12px` container, `8px` active item | `rounded-xl` / `rounded-lg` |
| Progress bar | `9999px` | `rounded-full` |

### 2.3 Shadows

Use only subtle shadows. Avoid heavy drop shadows.

- Cards: `shadow-sm`
- Active segmented item: `shadow-sm`
- Dialog overlay: use shadcn default overlay

### 2.4 Typography

| Element | Style |
|---------|-------|
| Page title | `text-3xl font-extrabold tracking-tight text-black sm:text-4xl` |
| Section title | `text-lg font-semibold text-black` |
| Question text | `text-lg font-medium text-black` |
| Label | `text-sm font-medium text-zinc-500` |
| Body / choice | `text-base text-black` |
| Meta / caption | `text-sm text-zinc-500` |
| Helper text | `text-xs text-zinc-500` |
| Rationale | `text-sm text-zinc-600` |

## 3. Global Layout

### 3.1 Page Container

```tsx
<main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
  {children}
</main>
```

For focused forms, use `max-w-2xl`.

### 3.2 Sticky Top Navigation

```tsx
<nav className="sticky top-0 z-50 bg-zinc-50 shadow-sm">
  <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:h-16">
    <span className="text-lg font-bold text-black sm:text-xl">App Name</span>
    <div className="flex items-center gap-4 sm:gap-6">
      <a className="text-sm font-medium text-zinc-500 hover:text-black transition-colors sm:text-base">
        Link
      </a>
    </div>
  </div>
</nav>
```

## 4. Component Recipes

### 4.1 Card

```tsx
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-2xl border border-zinc-200 bg-white shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}
```

### 4.2 Button

Primary:

```tsx
<button className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
  Primary
</button>
```

Outline:

```tsx
<button className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-black transition-colors hover:bg-zinc-100">
  Outline
</button>
```

Secondary:

```tsx
<button className="h-11 rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200">
  Secondary
</button>
```

Destructive:

```tsx
<button className="h-11 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
  Delete
</button>
```

### 4.3 Input

```tsx
<input
  className="flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-black transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none sm:text-sm"
  placeholder="Type here..."
/>
```

### 4.4 Textarea

```tsx
<textarea
  className="flex min-h-[80px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-black transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none sm:text-sm"
  placeholder="Paste your notes..."
/>
```

### 4.5 Select

```tsx
<select className="flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black transition-colors focus:border-zinc-500 focus:outline-none">
  <option>Option 1</option>
</select>
```

### 4.6 Badge / Chip

```tsx
<span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
  Badge
</span>
```

Active variant:

```tsx
<span className="inline-flex cursor-pointer items-center rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
  Active
</span>
```

### 4.7 Segmented Control

```tsx
<div className="flex flex-wrap rounded-xl bg-zinc-100 p-1">
  {options.map((opt) => (
    <button
      key={opt.value}
      className={cn(
        "min-w-[90px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium leading-tight transition-all sm:min-w-[120px]",
        value === opt.value
          ? "bg-black text-white shadow-sm"
          : "text-zinc-500 hover:text-zinc-800"
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

### 4.8 Progress Bar

```tsx
<div className="h-2 w-full rounded-full bg-zinc-100">
  <div
    className="h-full rounded-full bg-black transition-all"
    style={{ width: `${(current / total) * 100}%` }}
  />
</div>
```

### 4.9 File Upload Zone

```tsx
<label
  className={cn(
    "block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-colors sm:p-6",
    isDragging
      ? "border-zinc-400 bg-zinc-200"
      : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
  )}
>
  <input type="file" className="hidden" />
  <span className="text-sm text-zinc-600">
    <span className="font-medium text-black">Click to upload</span> or drag and drop
  </span>
</label>
```

### 4.10 Choice Button

```tsx
<button
  className={cn(
    "w-full rounded-xl border p-4 text-left text-base transition-all",
    selected
      ? "border-black bg-zinc-50 shadow-sm"
      : "border-zinc-200 bg-zinc-50 hover:border-zinc-400",
    disabled && "cursor-not-allowed opacity-50"
  )}
>
  <span className="mr-3 font-semibold text-zinc-500">A.</span>
  <span className="text-black">Choice text</span>
</button>
```

## 5. Page Patterns

### 5.1 Create / Form Page

- Centered `max-w-2xl` column with `space-y-5`
- Each section wrapped in a white `rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5`
- Full-width primary action at bottom with `h-14 rounded-2xl bg-black text-base font-semibold text-white hover:bg-zinc-800`

### 5.2 Quiz / One-Question-at-a-Time

- Sticky header with progress bar and `Question N of M`
- Question card: `rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm`
- Choices stacked with `space-y-2`

### 5.3 Review / List

- Scrollable vertical list of cards, `space-y-4`
- Correct answer: `border-black bg-zinc-100 font-medium`
- Wrong answer: `border-zinc-300 text-zinc-400 line-through`
- Rationale: `rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600`

### 5.4 History / List with Actions

- Header with page title and action buttons
- Search input under the header
- List items: `rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm`
- Badges for status / score
- Floating bottom action bar when selecting: `sticky bottom-4 rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-sm`

## 6. Spacing Rules

- Page section gap: `space-y-5` or `space-y-6`
- Inside card content gap: `space-y-3` or `space-y-4`
- Label to input: `space-y-2`
- Button group gap: `gap-2`
- Nav link gap: `gap-4 sm:gap-6`

## 7. Interaction Rules

- Use `transition-colors` or `transition-all` on interactive elements.
- Buttons should have an active press effect: `active:translate-y-px`.
- Use `focus-visible:ring-3 focus-visible:ring-ring/50` when using shadcn primitives.
- Disabled states: `disabled:opacity-50 disabled:pointer-events-none`.
- Hover links: `text-zinc-500 hover:text-black transition-colors`.

## 8. Responsive Rules

- Use `sm:` as the primary breakpoint for stacking into rows.
- Mobile actions often collapse into a `...` trigger dialog.
- Inputs and segmented controls should be full-width on mobile and split on desktop.

## 9. Font Setup

Load Geist Sans locally:

```tsx
import localFont from "next/font/local";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
```

Apply:

```tsx
<html lang="en" className={cn("font-sans", geistSans.variable)}>
  <body className={cn(geistSans.variable, "min-h-screen bg-zinc-50 font-sans antialiased")}>
    ...
  </body>
</html>
```

## 10. Do's and Don'ts

- **Do** keep the palette strictly within black, white, and zinc.
- **Do** use `rounded-2xl` for page-level cards and `rounded-xl` for buttons/inputs.
- **Do** keep shadows subtle (`shadow-sm` only).
- **Don't** introduce bright accent colors except for red (destructive) and amber (warnings).
- **Don't** use heavy borders; prefer `border-zinc-200` `1px` borders.
- **Don't** use boxy, sharp corners or heavy gradients.
