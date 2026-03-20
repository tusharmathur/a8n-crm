import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
  airtableUpdate: vi.fn(),
  airtableDelete: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetchOne } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET } from "@/app/api/meetings/[id]/route";
import { buildMeetingBlocks, type MeetingSlackPayload } from "@/lib/slack";

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockAuth = vi.mocked(auth);
const mockSession = { user: { email: "user@test.com", name: "Test User" } };

const mockMeetingRecord = {
  id: "recMeeting1",
  createdTime: "",
  fields: {
    "Attendee Name": "Alice Smith",
    "Attendee Company": "Acme Corp",
    "Attendee Email": "alice@acme.com",
    "Attendee Phone": "555-1234",
    "Attendee LinkedIn": "https://linkedin.com/in/alice",
    "Attendee Background": "Background text here.",
    Account: ["recAcc1"],
    Campaign: ["recCamp1"],
    "Meeting Taker": "Bob Jones",
    "Meeting Taker Email": "bob@a8n.com",
    "Meeting Creation Date": "2026-04-10T10:00:00.000Z",
    "Scheduled Meeting Date": "2026-04-15T14:00:00.000Z",
  },
};

const mockAccountRecord = {
  id: "recAcc1",
  createdTime: "",
  fields: { Name: "Acme", "Dashboard Link": "https://a8n-crm.vercel.app/client/rec123?token=abc" },
};

const mockCampaignRecord = {
  id: "recCamp1",
  createdTime: "",
  fields: { "Campaign Name": "Spring Outreach" },
};

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/meetings/${id}`);
}

// ─── GET /api/meetings/[id] ───────────────────────────────────────────────────

describe("GET /api/meetings/[id]", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFetchOne.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET(makeRequest("recMeeting1"), { params: Promise.resolve({ id: "recMeeting1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown meeting", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await GET(makeRequest("recBad"), { params: Promise.resolve({ id: "recBad" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with all fields for valid ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne
      .mockResolvedValueOnce(mockMeetingRecord as never)
      .mockResolvedValueOnce(mockAccountRecord as never)
      .mockResolvedValueOnce(mockCampaignRecord as never);
    const res = await GET(makeRequest("recMeeting1"), { params: Promise.resolve({ id: "recMeeting1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("recMeeting1");
    expect(data.fields["Attendee Name"]).toBe("Alice Smith");
  });

  it("resolves Account Name and Campaign Name from linked records", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne
      .mockResolvedValueOnce(mockMeetingRecord as never)
      .mockResolvedValueOnce(mockAccountRecord as never)
      .mockResolvedValueOnce(mockCampaignRecord as never);
    const res = await GET(makeRequest("recMeeting1"), { params: Promise.resolve({ id: "recMeeting1" }) });
    const data = await res.json();
    expect(data.accountName).toBe("Acme");
    expect(data.campaignName).toBe("Spring Outreach");
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockRejectedValue(new Error("Airtable down"));
    const res = await GET(makeRequest("recMeeting1"), { params: Promise.resolve({ id: "recMeeting1" }) });
    expect(res.status).toBe(500);
  });
});

// ─── Slack payload — meetingId ────────────────────────────────────────────────

describe("buildMeetingBlocks — meetingId", () => {
  const BASE: MeetingSlackPayload = {
    attendeeName: "Alice Smith",
    attendeeCompany: "Acme Corp",
    campaignName: "Spring Outreach",
    scheduledDate: "2026-04-15T14:00:00.000Z",
    meetingTaker: "Bob Jones",
    accountName: "Acme",
    accountDashboardLink: "https://a8n-crm.vercel.app/client/rec123?token=abc",
    slackChannel: "#acme",
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://a8n-crm.vercel.app";
  });

  it("includes View Meeting button when meetingId provided", () => {
    const { blocks } = buildMeetingBlocks({ ...BASE, meetingId: "recMeeting1" });
    const actions = blocks.find((b) => b.type === "actions") as { elements: { text: { text: string }; url: string }[] } | undefined;
    const meetingBtn = actions?.elements.find((e) => e.text.text === "View Meeting →");
    expect(meetingBtn).toBeDefined();
    expect(meetingBtn?.url).toContain("recMeeting1");
  });

  it("plain text includes meeting URL when meetingId provided", () => {
    const { text } = buildMeetingBlocks({ ...BASE, meetingId: "recMeeting1" });
    expect(text).toContain("recMeeting1");
  });

  it("omits View Meeting button when meetingId not provided", () => {
    const { blocks } = buildMeetingBlocks(BASE);
    const actions = blocks.find((b) => b.type === "actions") as { elements: { text: { text: string } }[] } | undefined;
    const meetingBtn = actions?.elements.find((e) => e.text.text === "View Meeting →");
    expect(meetingBtn).toBeUndefined();
  });

  it("still sends dashboard button when meetingId missing", () => {
    const { blocks } = buildMeetingBlocks(BASE);
    const actions = blocks.find((b) => b.type === "actions") as { elements: { text: { text: string } }[] } | undefined;
    expect(actions?.elements.length).toBeGreaterThan(0);
  });
});
