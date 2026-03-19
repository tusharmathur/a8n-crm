import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @slack/web-api before importing lib/slack
const mockPostMessage = vi.fn();
const mockConversationsList = vi.fn();

vi.mock("@slack/web-api", () => ({
  WebClient: vi.fn(function () {
    return {
      chat: { postMessage: mockPostMessage },
      conversations: { list: mockConversationsList },
    };
  }),
}));

import {
  sendMeetingSlackNotification,
  formatMeetingDate,
  normalizeChannel,
  buildMeetingBlocks,
  type MeetingSlackPayload,
} from "@/lib/slack";

const BASE_PAYLOAD: MeetingSlackPayload = {
  attendeeName: "Alice Smith",
  attendeeCompany: "Acme Corp",
  campaignName: "Spring Outreach",
  scheduledDate: "2026-04-15T14:00:00.000Z",
  meetingTaker: "Bob Jones",
  accountName: "Acme",
  accountDashboardLink: "https://a8n-crm.vercel.app/client/rec123?token=abc",
  slackChannel: "#test-channel",
};

const CHANNEL_LIST_FOUND = {
  channels: [{ id: "C123", name: "test-channel" }],
  response_metadata: { next_cursor: "" },
};
const CHANNEL_LIST_EMPTY = {
  channels: [],
  response_metadata: { next_cursor: "" },
};

// ─── formatMeetingDate ────────────────────────────────────────────────────────

describe("formatMeetingDate", () => {
  it("returns — for undefined", () => {
    expect(formatMeetingDate(undefined)).toBe("—");
  });

  it("returns human-readable string (not ISO)", () => {
    const result = formatMeetingDate("2026-04-15T14:00:00.000Z");
    expect(result).not.toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(result.length).toBeGreaterThan(10);
  });
});

// ─── normalizeChannel ─────────────────────────────────────────────────────────

describe("normalizeChannel", () => {
  it("strips leading # prefix", () => {
    expect(normalizeChannel("#test-channel")).toBe("test-channel");
  });

  it("returns unchanged when no # prefix", () => {
    expect(normalizeChannel("test-channel")).toBe("test-channel");
  });
});

// ─── buildMeetingBlocks ───────────────────────────────────────────────────────

describe("buildMeetingBlocks", () => {
  const { blocks, text } = buildMeetingBlocks(BASE_PAYLOAD);
  const section = blocks.find((b) => b.type === "section") as { text: { text: string } };
  const sectionText = section.text.text;

  it("contains correct attendee name", () => {
    expect(sectionText).toContain("Alice Smith");
  });

  it("contains correct attendee company", () => {
    expect(sectionText).toContain("Acme Corp");
  });

  it("contains correct campaign name", () => {
    expect(sectionText).toContain("Spring Outreach");
  });

  it("contains correct meeting taker", () => {
    expect(sectionText).toContain("Bob Jones");
  });

  it("contains correct account name", () => {
    expect(sectionText).toContain("Acme");
  });

  it("contains human-readable date (not ISO)", () => {
    expect(sectionText).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("plain text fallback contains all required fields", () => {
    expect(text).toContain("Alice Smith");
    expect(text).toContain("Acme Corp");
  });

  it("actions block has correct dashboard URL", () => {
    const actions = blocks.find((b) => b.type === "actions") as { elements: { url: string }[] } | undefined;
    expect(actions?.elements[0].url).toBe(BASE_PAYLOAD.accountDashboardLink);
  });
});

// ─── sendMeetingSlackNotification ─────────────────────────────────────────────

describe("sendMeetingSlackNotification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it("returns early without calling Slack when slackChannel is empty", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    await sendMeetingSlackNotification({ ...BASE_PAYLOAD, slackChannel: "" });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("returns without throwing when neither token nor webhook configured", async () => {
    await expect(sendMeetingSlackNotification(BASE_PAYLOAD)).resolves.toBeUndefined();
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("normalizes channel name with # prefix for API call", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification({ ...BASE_PAYLOAD, slackChannel: "#test-channel" });
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: "C123" }));
  });

  it("handles channel name without # prefix", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification({ ...BASE_PAYLOAD, slackChannel: "test-channel" });
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: "C123" }));
  });

  it("calls chat.postMessage with correct blocks when bot token set and channel found", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification(BASE_PAYLOAD);
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "C123",
        blocks: expect.arrayContaining([expect.objectContaining({ type: "header" })]),
        text: expect.stringContaining("Alice Smith"),
      })
    );
  });

  it("falls back to webhook when bot token set but channel not found", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_EMPTY);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification(BASE_PAYLOAD);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls back to webhook when postMessage fails", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    mockConversationsList.mockResolvedValue(CHANNEL_LIST_FOUND);
    mockPostMessage.mockRejectedValue(new Error("post failed"));
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification(BASE_PAYLOAD);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("uses webhook only when only SLACK_WEBHOOK_URL is set", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await sendMeetingSlackNotification(BASE_PAYLOAD);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("never throws on Slack API error", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    mockConversationsList.mockRejectedValue(new Error("auth error"));
    await expect(sendMeetingSlackNotification(BASE_PAYLOAD)).resolves.toBeUndefined();
  });

  it("never throws on webhook fetch error", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    await expect(sendMeetingSlackNotification(BASE_PAYLOAD)).resolves.toBeUndefined();
  });
});
