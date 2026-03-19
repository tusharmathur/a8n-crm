import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

// Keep a ref to the mock create function so we can control it per-test
const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockMessagesCreate };
  },
}));

import { auth } from "@/auth";
import { POST } from "@/app/api/generate-background/route";

const mockAuth = vi.mocked(auth);
const mockSession = { user: { email: "user@test.com" } };

const makeRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/generate-background", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/generate-background", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockMessagesCreate.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest({ attendeeName: "Jane" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when attendeeName is empty", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({ attendeeName: "" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when attendeeName is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it("calls Anthropic and returns trimmed background text", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "  Jane is a VP at Acme.  " }],
    });

    const res = await POST(makeRequest({
      attendeeName: "Jane Doe",
      accountName: "Acme",
      campaignName: "Q1",
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.background).toBe("Jane is a VP at Acme.");
  });

  it("response text is trimmed", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "\n\n  Some background  \n\n" }],
    });

    const res = await POST(makeRequest({ attendeeName: "Jane" }) as never);
    const data = await res.json();
    expect(data.background).toBe("Some background");
  });

  it("returns 500 when Anthropic API errors without exposing key", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockMessagesCreate.mockRejectedValue(new Error("auth error with key sk-ant-secret"));

    const res = await POST(makeRequest({ attendeeName: "Jane" }) as never);
    expect(res.status).toBe(500);
    const data = await res.json();
    // Error message should not expose the API key
    expect(JSON.stringify(data)).not.toContain("sk-ant-secret");
  });

  it("works with only attendeeName provided (partial fields)", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Brief about Jane." }],
    });

    const res = await POST(makeRequest({ attendeeName: "Jane" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.background).toBe("Brief about Jane.");
  });

  it("ANTHROPIC_API_KEY is read from env, never hardcoded in response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Background text." }],
    });
    const res = await POST(makeRequest({ attendeeName: "Jane" }) as never);
    const text = await res.text();
    expect(text).not.toContain("sk-ant-api03");
  });
});
