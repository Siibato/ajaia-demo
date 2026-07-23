export function collectThreadIds(content: unknown): string[] {
  if (typeof content !== "string") return [];

  const ids = new Set<string>();
  const regex = /data-thread-id="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}
