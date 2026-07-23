import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockCompare, mockHash } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
}));

import { authOptions, authorize } from "@/lib/auth";

const fakeUser = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  passwordHash: "$2b$10$hashed",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authorize callback", () => {
  it("returns null when credentials are missing", async () => {
    const result = await authorize(undefined);
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when email is missing", async () => {
    const result = await authorize({ password: "password" });
    expect(result).toBeNull();
  });

  it("returns null when password is missing", async () => {
    const result = await authorize({ email: "alice@example.com" });
    expect(result).toBeNull();
  });

  it("returns null when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await authorize({
      email: "nobody@example.com",
      password: "password",
    });
    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "nobody@example.com" },
    });
  });

  it("returns null when password hash is missing", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      passwordHash: null,
    });
    const result = await authorize({
      email: "alice@example.com",
      password: "password",
    });
    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    mockFindUnique.mockResolvedValue(fakeUser);
    mockCompare.mockResolvedValue(false);
    const result = await authorize({
      email: "alice@example.com",
      password: "wrong",
    });
    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith("wrong", fakeUser.passwordHash);
  });

  it("returns user object on valid credentials", async () => {
    mockFindUnique.mockResolvedValue(fakeUser);
    mockCompare.mockResolvedValue(true);
    const result = await authorize({
      email: "alice@example.com",
      password: "password",
    });
    expect(result).toEqual({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
    });
  });
});

describe("authOptions configuration", () => {
  it("uses JWT session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("sets signIn page to /auth/signin", () => {
    expect(authOptions.pages?.signIn).toBe("/auth/signin");
  });

  it("has exactly one provider", () => {
    expect(authOptions.providers).toHaveLength(1);
  });

  it("jwt callback copies user.id to token", async () => {
    const token = {};
    const result = await authOptions.callbacks?.jwt?.({
      token,
      user: { id: "user-1" } as never,
    } as never);
    expect(result?.id).toBe("user-1");
  });

  it("jwt callback preserves existing token when no user", async () => {
    const token = { id: "existing" };
    const result = await authOptions.callbacks?.jwt?.({ token } as never);
    expect(result?.id).toBe("existing");
  });

  it("session callback copies token.id to session.user.id", async () => {
    const session = { user: { id: "" } } as never;
    const result = await authOptions.callbacks?.session?.({
      session,
      token: { id: "user-1" },
    } as never);
    expect((result as { user: { id: string } }).user.id).toBe("user-1");
  });
});
