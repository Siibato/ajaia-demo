import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockCreate, mockHash } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: mockHash,
  },
}));

import { POST } from "@/app/api/auth/signup/route";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHash.mockResolvedValue("$2b$10$hashed");
});

describe("POST /api/auth/signup", () => {
  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ email: "not-an-email", password: "password" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid");
  });

  it("returns 400 for short password", async () => {
    const res = await POST(makeReq({ email: "test@test.com", password: "123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makeReq({ password: "password" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing password", async () => {
    const res = await POST(makeReq({ email: "test@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeReq({ email: "alice@example.com", password: "password" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already exists");
  });

  it("creates user and returns 200 on valid signup", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user",
      email: "new@test.com",
    });
    const res = await POST(
      makeReq({ email: "new@test.com", password: "password", name: "New User" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("new-user");
    expect(data.email).toBe("new@test.com");
    expect(mockHash).toHaveBeenCalledWith("password", 10);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "new@test.com",
        passwordHash: "$2b$10$hashed",
        name: "New User",
      },
    });
  });

  it("creates user without name when not provided", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "new-user", email: "new@test.com" });
    const res = await POST(
      makeReq({ email: "new@test.com", password: "password" })
    );
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "new@test.com",
        passwordHash: "$2b$10$hashed",
        name: undefined,
      },
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));
    const res = await POST(
      makeReq({ email: "test@test.com", password: "password" })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Something went wrong");
  });
});
