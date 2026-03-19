import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetch, airtableFetchOne, airtableCreate } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET as getAll, POST } from "@/app/api/accounts/route";
import { GET as getOne } from "@/app/api/accounts/[id]/route";

const mockFetch = vi.mocked(airtableFetch);
const mockFetchOne = vi.mocked(airtableFetchOne);
const mockCreate = vi.mocked(airtableCreate);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "user@test.com", name: "Test User" } };
const mockAccount = { id: "rec1", fields: { Name: "Acme Corp" }, createdTime: "" };

describe("GET /api/accounts", () => {
  beforeEach(() => { mockFetch.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getAll();
    expect(res.status).toBe(401);
  });

  it("returns array of accounts", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([mockAccount] as never);
    const res = await getAll();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("rec1");
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockRejectedValue(new Error("Airtable error"));
    const res = await getAll();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("GET /api/accounts/[id]", () => {
  beforeEach(() => { mockFetchOne.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getOne({} as Request, { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(401);
  });

  it("returns single account", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    const res = await getOne({} as Request, { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("rec1");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await getOne({} as Request, { params: Promise.resolve({ id: "notfound" }) });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/accounts", () => {
  beforeEach(() => { mockCreate.mockReset(); mockAuth.mockReset(); });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest({ Name: "Acme" }) as never);
    expect(res.status).toBe(401);
  });

  it("creates account with valid body + writes audit log", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { Name: "Acme" }, createdTime: "" } as never);
    const res = await POST(makeRequest({ Name: "Acme" }) as never);
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns 400 when Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ Status: "Current" }) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockRejectedValue(new Error("Airtable error"));
    const res = await POST(makeRequest({ Name: "Acme" }) as never);
    expect(res.status).toBe(500);
  });
});
