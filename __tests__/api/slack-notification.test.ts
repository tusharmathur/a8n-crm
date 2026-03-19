import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPostMessage = vi.fn();
const mockConversationsList = vi.fn();
const mockConversationsInvite = vi.fn();
const mockConversationsJoin = vi.fn();
const mockAuthTest = vi.fn();

vi.mock("@slack/web-api", () => ({
  WebClient: vi.fn(function () {
    return {
      chat: { postMessage: mockPostMessage },
      conversations: { list: mockConversationsList, invite: mockConversationsInvite, join: mockConversationsJoin },
      auth: { test: mockAuthTest },
    };
  }),
}));

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableFetchOne: vi.fn(),
  airtableCreate: vi.fn(),
  airtableUpdate: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/slack", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/slack")>();
  return { ...original, sendMeetingSlackNotification: vi.fn().mockResolvedValue(undefined) };
});

import { airtableFetchOne, airtableCreate } from "@/lib/airtable";
import { auth } from "@/auth";
import { sendMeetingSlackNotification } from "@/lib/slack";
import { POST as createMeeting } from "@/app/api/meetings/route";
import { POST as slackTest } from "@/app/api/slack/test/route";

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockCreate = vi.mocked(airtableCreate);
const mockAuth = vi.mocked(auth);
const mockSlack = vi.mocked(sendMeetingSlackNotification);
const mockSession = { user: { email: "user@test.com", name: "Test User" } };

// ─── POST /api/meetings — Slack integration ───────────────────────────────────

const mockAccountRecord = {
  id: "recAcc1",
  createdTime: "",
  fields: {
    Name: "Acme",
    "Slack Channel": "#acme",
    "Dashboard Link": "https://a8n-crm.vercel.app/client/rec123?token=abc",
  },
};
const mockCampaignRecord = {
  id: "recCamp1",
  createdTime: "",
  fields: { "Campaign Name": "Spring Outreach" },
};

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const mockMeetingBody = {
  "Attendee Name": "Alice",
  Account: ["recAcc1"],
  Campaign: ["recCamp1"],
  "Meeting Taker": "Bob",
  "Scheduled Meeting Date": "2026-04-15T14:00:00.000Z",
};

describe("POST /api/meetings — Slack integration", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCreate.mockReset();
    mockFetchOne.mockReset();
    mockSlack.mockReset();
    mockSlack.mockResolvedValue(undefined);
  });

  it("calls sendMeetingSlackNotification after successful meeting create", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Attendee Name": "Alice" }, createdTime: "" } as never);
    mockFetchOne
      .mockResolvedValueOnce(mockAccountRecord as never)
      .mockResolvedValueOnce(mockCampaignRecord as never);
    await createMeeting(makeRequest(mockMeetingBody));
    expect(mockSlack).toHaveBeenCalledOnce();
  });

  it("calls sendMeetingSlackNotification with correct payload", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Attendee Name": "Alice" }, createdTime: "" } as never);
    mockFetchOne
      .mockResolvedValueOnce(mockAccountRecord as never)
      .mockResolvedValueOnce(mockCampaignRecord as never);
    await createMeeting(makeRequest(mockMeetingBody));
    expect(mockSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeName: "Alice",
        accountName: "Acme",
        slackChannel: "#acme",
      })
    );
  });

  it("returns 201 even when Slack notification fails", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { "Attendee Name": "Alice" }, createdTime: "" } as never);
    mockFetchOne.mockResolvedValue(null);
    mockSlack.mockRejectedValue(new Error("Slack down"));
    const res = await createMeeting(makeRequest(mockMeetingBody));
    expect(res.status).toBe(201);
  });
});

// ─── POST /api/slack/test ─────────────────────────────────────────────────────

const makeTestRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/slack/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const mockAccountWithChannel = {
  id: "rec123",
  createdTime: "",
  fields: { Name: "Acme Corp", "Slack Channel": "#acme" },
};

const CHANNEL_LIST_FOUND = {
  channels: [{ id: "C123", name: "acme" }],
  response_metadata: { next_cursor: "" },
};
const CHANNEL_LIST_EMPTY = {
  channels: [],
  response_metadata: { next_cursor: "" },
};

describe("POST /api/slack/test", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    mockAuth.mockResolvedValue(mockSession as never);
    mockAuthTest.mockResolvedValue({ user_id: "UBOT123" });
  });

  afterEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown account", async () => {
    mockFetchOne.mockResolvedValue(null);
    const res = await slackTest(makeTestRequest({ accountId: "recBad" }));
    expect(res.status).toBe(404);
  });

  it("returns success: false when no channel configured", async () => {
    mockFetchOne.mockResolvedValue({
      ...mockAccountWithChannel,
      fields: { Name: "Acme", "Slack Channel": "" },
    } as never);
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/no channel/i);
  });

  it("returns success: false when channel not found", async () => {
    mockFetchOne.mockResolvedValue(mockAccountWithChannel as never);
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_EMPTY);
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/channel not found/i);
  });

  it("sends message and returns success with channel name", async () => {
    mockFetchOne.mockResolvedValue(mockAccountWithChannel as never);
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockResolvedValue({ ok: true });
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.channel).toBe("#acme");
  });

  it("returns success: false with helpful message when bot not in channel", async () => {
    mockFetchOne.mockResolvedValue(mockAccountWithChannel as never);
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockRejectedValue({ data: { error: "not_in_channel" } });
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invite/i);
  });

  it("returns success: false when postMessage throws", async () => {
    mockFetchOne.mockResolvedValue(mockAccountWithChannel as never);
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockRejectedValue(new Error("channel_not_found"));
    const res = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("channel_not_found");
  });

  it("handles multiple calls without error", async () => {
    mockFetchOne.mockResolvedValue(mockAccountWithChannel as never);
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockResolvedValue({ ok: true });
    const res1 = await slackTest(makeTestRequest({ accountId: "rec123" }));
    const res2 = await slackTest(makeTestRequest({ accountId: "rec123" }));
    expect((await res1.json()).success).toBe(true);
    expect((await res2.json()).success).toBe(true);
  });
});
