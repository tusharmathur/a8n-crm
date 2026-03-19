import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetch, airtableCreate } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET, POST } from "@/app/api/campaigns/route";

const mockFetch = vi.mocked(airtableFetch);
const mockCreate = vi.mocked(airtableCreate);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "user@test.com", name: "Test" } };

describe("GET /api/campaigns", () => {
  beforeEach(() => { mockFetch.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns campaigns array", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([{ id: "rec1", fields: { "Campaign Name": "Test", Account: [] }, createdTime: "" }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockRejectedValue(new Error("error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/campaigns", () => {
  beforeEach(() => { mockCreate.mockReset(); mockAuth.mockReset(); });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest({ "Campaign Name": "Test", Account: ["rec1"] }) as never);
    expect(res.status).toBe(401);
  });

  it("creates campaign with valid body", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Campaign Name": "Test" }, createdTime: "" } as never);
    const res = await POST(makeRequest({ "Campaign Name": "Test", Account: ["rec1"] }) as never);
    expect(res.status).toBe(201);
  });

  it("returns 400 when Campaign Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ Account: ["rec1"] }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Account is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ "Campaign Name": "Test" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockRejectedValue(new Error("error"));
    const res = await POST(makeRequest({ "Campaign Name": "Test", Account: ["rec1"] }) as never);
    expect(res.status).toBe(500);
  });
});
