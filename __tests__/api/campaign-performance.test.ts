import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetch, airtableFetchOne } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET } from "@/app/api/campaigns/route";
import { NextRequest } from "next/server";
import { parseRate, avgRate } from "@/lib/utils";

const mockFetch = vi.mocked(airtableFetch);
const mockFetchOne = vi.mocked(airtableFetchOne);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "user@test.com", name: "Test User" } };

const makeCampaign = (id: string, accountId: string, overrides = {}) => ({
  id,
  fields: {
    "Campaign Name": `Campaign ${id}`,
    Account: [accountId],
    "Acceptance Rate": "37.5%",
    "Reply Rate": "12.0%",
    ...overrides,
  },
  createdTime: "",
});

describe("GET /api/campaigns?account=[id]", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetchOne.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/campaigns?account=recABC");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns only campaigns for the given account", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const campaigns = [makeCampaign("rec1", "recABC"), makeCampaign("rec2", "recABC")];
    mockFetch.mockResolvedValue(campaigns as never);
    mockFetchOne.mockResolvedValue({ id: "recABC", fields: { Name: "Acme" }, createdTime: "" } as never);

    const req = new NextRequest("http://localhost/api/campaigns?account=recABC");
    const res = await GET(req);
    expect(res.status).toBe(200);
    // airtableFetch called with a filter formula containing the account ID
    expect(mockFetch).toHaveBeenCalledWith(
      "Campaigns",
      expect.stringContaining("recABC")
    );
  });

  it("returns all campaigns when no account filter", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([makeCampaign("rec1", "recABC")] as never);
    mockFetchOne.mockResolvedValue({ id: "recABC", fields: { Name: "Acme" }, createdTime: "" } as never);

    const req = new NextRequest("http://localhost/api/campaigns");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith("Campaigns", undefined);
  });

  it("enriches each campaign with accountName", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockResolvedValue([makeCampaign("rec1", "recABC")] as never);
    mockFetchOne.mockResolvedValue({ id: "recABC", fields: { Name: "Acme Corp" }, createdTime: "" } as never);

    const req = new NextRequest("http://localhost/api/campaigns");
    const res = await GET(req);
    const data = await res.json();
    expect(data[0].accountName).toBe("Acme Corp");
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetch.mockRejectedValue(new Error("Airtable error"));
    const req = new NextRequest("http://localhost/api/campaigns");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ─── parseRate utility ────────────────────────────────────────────────────────

describe("parseRate()", () => {
  it("parses '37.5%' to 0.375", () => {
    expect(parseRate("37.5%")).toBeCloseTo(0.375);
  });

  it("returns 0 for '—'", () => {
    expect(parseRate("—")).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(parseRate(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseRate("")).toBe(0);
  });

  it("parses '100%' to 1", () => {
    expect(parseRate("100%")).toBe(1);
  });

  it("parses '0%' to 0", () => {
    expect(parseRate("0%")).toBe(0);
  });
});

// ─── avgRate utility ──────────────────────────────────────────────────────────

describe("avgRate()", () => {
  it("computes mean of valid rate strings", () => {
    expect(avgRate(["40%", "60%"])).toBe("50.0%");
  });

  it("skips '—' values in average calculation", () => {
    expect(avgRate(["—", "50%", "—"])).toBe("50.0%");
  });

  it("returns '—' when all values are '—'", () => {
    expect(avgRate(["—", "—"])).toBe("—");
  });

  it("returns '—' for empty array", () => {
    expect(avgRate([])).toBe("—");
  });

  it("handles undefined values", () => {
    expect(avgRate([undefined, "60%"])).toBe("60.0%");
  });
});
