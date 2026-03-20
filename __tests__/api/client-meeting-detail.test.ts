import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetchOne: vi.fn(),
}));

import { NextRequest } from "next/server";
import { airtableFetchOne } from "@/lib/airtable";
import { GET } from "@/app/api/client/[accountId]/meetings/[meetingId]/route";

const mockFetchOne = vi.mocked(airtableFetchOne);

const VALID_TOKEN = "c".repeat(64);
const STORED_LINK = `https://a8n-crm.vercel.app/client/recAcc1?token=${VALID_TOKEN}`;

const mockAccount = {
  id: "recAcc1",
  createdTime: "",
  fields: {
    Name: "Acme Corp",
    "Dashboard Link": STORED_LINK,
  },
};

const mockMeeting = {
  id: "recMtg1",
  createdTime: "",
  fields: {
    "Attendee Name": "Bob Smith",
    "Attendee Company": "SmithCo",
    "Attendee Email": "bob@smith.com",
    "Attendee Phone": "555-1234",
    "Attendee LinkedIn": "linkedin.com/bob",
    "Attendee Background": "Works at startup",
    "Meeting Taker Email": "jane@a8n.com",
    "Scheduled Meeting Date": "2026-03-15",
    "Meeting Creation Date": "2026-03-01",
    "Meeting Taker": "Jane",
    "Outcome / Next Steps": "Follow up next week",
    Account: ["recAcc1"],
  },
};

const makeRequest = (accountId: string, meetingId: string, token?: string) => {
  const url = token
    ? `http://localhost/api/client/${accountId}/meetings/${meetingId}?token=${token}`
    : `http://localhost/api/client/${accountId}/meetings/${meetingId}`;
  return new NextRequest(url) as never;
};

const makeParams = (accountId: string, meetingId: string) =>
  ({ params: Promise.resolve({ accountId, meetingId }) });

describe("GET /api/client/[accountId]/meetings/[meetingId]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
  });

  it("returns 403 when token is missing", async () => {
    const res = await GET(makeRequest("recAcc1", "recMtg1"), makeParams("recAcc1", "recMtg1"));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/invalid token/i);
  });

  it("returns 404 for unknown account", async () => {
    mockFetchOne.mockResolvedValueOnce(null);
    const res = await GET(
      makeRequest("recBad", "recMtg1", VALID_TOKEN),
      makeParams("recBad", "recMtg1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when token does not match", async () => {
    mockFetchOne.mockResolvedValueOnce(mockAccount as never);
    const res = await GET(
      makeRequest("recAcc1", "recMtg1", "d".repeat(64)),
      makeParams("recAcc1", "recMtg1")
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/invalid token/i);
  });

  it("returns 404 for unknown meeting", async () => {
    mockFetchOne
      .mockResolvedValueOnce(mockAccount as never)
      .mockResolvedValueOnce(null);
    const res = await GET(
      makeRequest("recAcc1", "recMtgBad", VALID_TOKEN),
      makeParams("recAcc1", "recMtgBad")
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when meeting belongs to a different account", async () => {
    const wrongMeeting = {
      ...mockMeeting,
      fields: { ...mockMeeting.fields, Account: ["recOtherAcc"] },
    };
    mockFetchOne
      .mockResolvedValueOnce(mockAccount as never)
      .mockResolvedValueOnce(wrongMeeting as never);
    const res = await GET(
      makeRequest("recAcc1", "recMtg1", VALID_TOKEN),
      makeParams("recAcc1", "recMtg1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with safe fields for valid token and correct account", async () => {
    mockFetchOne
      .mockResolvedValueOnce(mockAccount as never)
      .mockResolvedValueOnce(mockMeeting as never);
    const res = await GET(
      makeRequest("recAcc1", "recMtg1", VALID_TOKEN),
      makeParams("recAcc1", "recMtg1")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("recMtg1");
    expect(data.fields["Attendee Name"]).toBe("Bob Smith");
    expect(data.fields["Attendee Company"]).toBe("SmithCo");
    expect(data.fields["Meeting Taker"]).toBe("Jane");
    expect(data.fields["Outcome / Next Steps"]).toBe("Follow up next week");
  });

  it("never returns PII or internal fields", async () => {
    mockFetchOne
      .mockResolvedValueOnce(mockAccount as never)
      .mockResolvedValueOnce(mockMeeting as never);
    const res = await GET(
      makeRequest("recAcc1", "recMtg1", VALID_TOKEN),
      makeParams("recAcc1", "recMtg1")
    );
    const data = await res.json();
    expect(data.fields["Attendee Email"]).toBeUndefined();
    expect(data.fields["Attendee Phone"]).toBeUndefined();
    expect(data.fields["Attendee LinkedIn"]).toBeUndefined();
    expect(data.fields["Attendee Background"]).toBeUndefined();
    expect(data.fields["Meeting Taker Email"]).toBeUndefined();
  });

  it("sets no-store cache and noindex headers", async () => {
    mockFetchOne
      .mockResolvedValueOnce(mockAccount as never)
      .mockResolvedValueOnce(mockMeeting as never);
    const res = await GET(
      makeRequest("recAcc1", "recMtg1", VALID_TOKEN),
      makeParams("recAcc1", "recMtg1")
    );
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
  });
});
