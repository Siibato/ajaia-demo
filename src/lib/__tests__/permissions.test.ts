import { describe, it, expect } from "vitest";
import {
  canView,
  canEdit,
  canComment,
  canShare,
  type AccessLevel,
} from "@/lib/permissions";

const allLevels: AccessLevel[] = [
  "owner",
  "editor",
  "commenter",
  "viewer",
  "none",
];

describe("canView", () => {
  it("returns true for owner, editor, commenter, viewer", () => {
    expect(canView("owner")).toBe(true);
    expect(canView("editor")).toBe(true);
    expect(canView("commenter")).toBe(true);
    expect(canView("viewer")).toBe(true);
  });

  it("returns false for none", () => {
    expect(canView("none")).toBe(false);
  });
});

describe("canEdit", () => {
  it("returns true for owner and editor only", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
  });

  it("returns false for commenter, viewer, none", () => {
    expect(canEdit("commenter")).toBe(false);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit("none")).toBe(false);
  });
});

describe("canComment", () => {
  it("returns true for owner, editor, commenter", () => {
    expect(canComment("owner")).toBe(true);
    expect(canComment("editor")).toBe(true);
    expect(canComment("commenter")).toBe(true);
  });

  it("returns false for viewer and none", () => {
    expect(canComment("viewer")).toBe(false);
    expect(canComment("none")).toBe(false);
  });
});

describe("canShare", () => {
  it("returns true for owner only", () => {
    expect(canShare("owner")).toBe(true);
  });

  it("returns false for all non-owner levels", () => {
    expect(canShare("editor")).toBe(false);
    expect(canShare("commenter")).toBe(false);
    expect(canShare("viewer")).toBe(false);
    expect(canShare("none")).toBe(false);
  });
});

describe("guard matrix completeness", () => {
  it("covers every AccessLevel without throwing", () => {
    for (const level of allLevels) {
      expect(() => {
        canView(level);
        canEdit(level);
        canComment(level);
        canShare(level);
      }).not.toThrow();
    }
  });
});
