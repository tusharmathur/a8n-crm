import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableCreate: vi.fn(),
  airtableUpdate: vi.fn(),
  airtableDelete: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password"), compare: vi.fn() },
}));

import { airtableFetch, airtableCreate, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET, POST } from "@/app/api/users/route";
import { PATCH, DELETE } from "@/app/api/users/[id]/route";

const mockFetch = vi.mocked(airtableFetch);
const mockCreate = vi.mocked(airtableCreate);
const mockUpdate = vi.mocked(airtableUpdate);
const mockDelete = vi.mocked(airtableDelete);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "admin@test.com", name: "Admin" } };

const mockUserWithHash = {
  id: "rec1",
  fields: {
    Name: "Alice",
    Email: "alice@test.com",
    "Password Hash": "bcrypt_hash",
    Status: "Active" as const,
    "Added By": "admin@test.com",
  },
  createdTime: "",
};

describe("GET /api/users", () => {
  beforeEach(() => { mockFetch.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("Password Hash is NEVER in response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([mockUserWithHash] as never);
    const res = await GET();
    const data = await res.json();
    expect(data[0].fields["Password Hash"]).toBeUndefined();
  });

  it("returns users array", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([mockUserWithHash] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].fields.Name).toBe("Alice");
  });
});

describe("POST /api/users", () => {
  beforeEach(() => { mockFetch.mockReset(); mockCreate.mockReset(); mockAuth.mockReset(); });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest({ Name: "Bob", Email: "bob@x.com", Password: "secret123" }) as never);
    expect(res.status).toBe(401);
  });

  it("hashes password server-side before saving", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { Name: "Bob", Email: "bob@x.com", Status: "Active" as const, "Password Hash": "hashed" }, createdTime: "" } as never);
    await POST(makeRequest({ Name: "Bob", Email: "bob@x.com", Password: "secret123" }) as never);
    const [, fields] = mockCreate.mock.calls[0];
    expect(fields["Password Hash"]).toBeDefined();
    expect(fields["Password Hash"]).not.toBe("secret123");
  });

  it("returns 409 on duplicate email", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([mockUserWithHash] as never);
    const res = await POST(makeRequest({ Name: "Alice2", Email: "alice@test.com", Password: "secret123" }) as never);
    expect(res.status).toBe(409);
  });

  it("returns 400 when password < 8 chars", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ Name: "Bob", Email: "bob@x.com", Password: "short" }) as never);
    expect(res.status).toBe(400);
  });

  it("Password Hash never returned in response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { Name: "Bob", Email: "bob@x.com", Status: "Active" as const, "Password Hash": "hashed" }, createdTime: "" } as never);
    const res = await POST(makeRequest({ Name: "Bob", Email: "bob@x.com", Password: "secret123" }) as never);
    const data = await res.json();
    expect(data.fields["Password Hash"]).toBeUndefined();
  });
});

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => { mockUpdate.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ Status: "Suspended" }) }),
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("toggles status correctly", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockUpdate.mockResolvedValue({ id: "rec1", fields: { Name: "Alice", Email: "a@x.com", Status: "Suspended" as const }, createdTime: "" } as never);
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Status: "Suspended" }) }),
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith("Users", "rec1", { Status: "Suspended" });
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => { mockFetch.mockReset(); mockDelete.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when deleting own account", async () => {
    mockAuth.mockResolvedValue({ user: { email: "admin@test.com" } } as never);
    mockFetch.mockResolvedValue([{ id: "recAdmin", fields: { Email: "admin@test.com" } }] as never);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "recAdmin" }) });
    expect(res.status).toBe(403);
  });

  it("deletes another user successfully", async () => {
    mockAuth.mockResolvedValue({ user: { email: "admin@test.com" } } as never);
    mockFetch.mockResolvedValue([{ id: "recAdmin", fields: { Email: "admin@test.com" } }] as never);
    mockDelete.mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "recOther" }) });
    expect(res.status).toBe(200);
  });
});
