import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { NextRequest } from "next/server";
import { airtableFetch, airtableCreate } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET, POST } from "@/app/api/meetings/route";

const mockFetch = vi.mocked(airtableFetch);
const mockCreate = vi.mocked(airtableCreate);
const mockAuth = vi.mocked(auth);
const mockSession = { user: { email: "user@test.com", name: "Test" } };

describe("GET /api/meetings", () => {
  beforeEach(() => { mockFetch.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/meetings") as never);
    expect(res.status).toBe(401);
  });

  it("returns meetings array", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([{
      id: "rec1",
      fields: { "Attendee Name": "Jane", Account: [], Campaign: [] },
      createdTime: "",
    }] as never);
    const res = await GET(new NextRequest("http://localhost/api/meetings") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("filters by accountId when provided", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([] as never);
    const res = await GET(new NextRequest("http://localhost/api/meetings?accountId=rec123") as never);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith("Meetings", expect.stringContaining("rec123"));
  });
});

describe("POST /api/meetings", () => {
  beforeEach(() => { mockCreate.mockReset(); mockAuth.mockReset(); });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest({ "Attendee Name": "Jane", Account: ["r1"], Campaign: ["r2"] }) as never);
    expect(res.status).toBe(401);
  });

  it("creates meeting with all required fields", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Attendee Name": "Jane" }, createdTime: "" } as never);
    const res = await POST(makeRequest({
      "Attendee Name": "Jane",
      Account: ["rec1"],
      Campaign: ["rec2"],
      "Attendee Background": "Some background text",
    }) as never);
    expect(res.status).toBe(201);
  });

  it("creates meeting without Attendee Background (optional)", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Attendee Name": "Jane" }, createdTime: "" } as never);
    const res = await POST(makeRequest({
      "Attendee Name": "Jane",
      Account: ["rec1"],
      Campaign: ["rec2"],
    }) as never);
    expect(res.status).toBe(201);
  });

  it("returns 400 when Attendee Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ Account: ["r1"], Campaign: ["r2"] }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Account is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ "Attendee Name": "Jane", Campaign: ["r2"] }) as never);
    expect(res.status).toBe(400);
  });
});
