import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Token utility tests ──────────────────────────────────────────────────────

import { generateDashboardToken, extractTokenFromLink, timingSafeCompare } from "@/lib/token";

describe("generateDashboardToken", () => {
  it("returns a non-empty string", () => {
    expect(generateDashboardToken()).toBeTruthy();
  });

  it("returns a 64-character token", () => {
    expect(generateDashboardToken()).toHaveLength(64);
  });

  it("produces different tokens on each call", () => {
    expect(generateDashboardToken()).not.toBe(generateDashboardToken());
  });
});

describe("extractTokenFromLink", () => {
  it("extracts token from a valid URL", () => {
    expect(extractTokenFromLink("https://app.example.com/client/rec123?token=abc")).toBe("abc");
  });

  it("returns null for an invalid URL", () => {
    expect(extractTokenFromLink("not-a-url")).toBeNull();
  });

  it("returns null when token param is absent", () => {
    expect(extractTokenFromLink("https://app.example.com/client/rec123")).toBeNull();
  });
});

describe("timingSafeCompare", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeCompare("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(timingSafeCompare("aaaaaa", "bbbbbb")).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(timingSafeCompare("abc", "abcd")).toBe(false);
  });
});

// ─── Public API tests ─────────────────────────────────────────────────────────

vi.mock("@/lib/airtable", () => ({
  airtableFetchOne: vi.fn(),
  airtableFetch: vi.fn(),
  airtableCreate: vi.fn(),
  airtableUpdate: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { NextRequest } from "next/server";
import { airtableFetchOne, airtableFetch, airtableUpdate } from "@/lib/airtable";
import { auth } from "@/auth";
import { GET as clientGet } from "@/app/api/client/[accountId]/route";
import { POST as generateLink } from "@/app/api/accounts/[id]/generate-link/route";
import { POST as createAccount } from "@/app/api/accounts/route";

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockFetch = vi.mocked(airtableFetch);
const mockUpdate = vi.mocked(airtableUpdate);
const mockAuth = vi.mocked(auth);
const mockSession = { user: { email: "user@test.com", name: "Test User" } };

const VALID_TOKEN = "a".repeat(64);
const STORED_LINK = `https://a8n-crm.vercel.app/client/rec123?token=${VALID_TOKEN}`;

const mockAccount = {
  id: "rec123",
  createdTime: "",
  fields: {
    Name: "Acme Corp",
    Status: "Current",
    Website: "https://acme.com",
    "Account Owner": "Jane Smith",
    "Engagement Goals": "More meetings",
    Address: "123 Main St",
    "Dashboard Link": STORED_LINK,
  },
};

const makeClientRequest = (accountId: string, token?: string) => {
  const url = token
    ? `http://localhost/api/client/${accountId}?token=${token}`
    : `http://localhost/api/client/${accountId}`;
  return new NextRequest(url) as never;
};

describe("GET /api/client/[accountId]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockFetch.mockReset();
  });

  it("returns 403 when token is missing", async () => {
    const res = await clientGet(makeClientRequest("rec123"), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/invalid token/i);
  });

  it("returns 404 for unknown accountId", async () => {
    mockFetchOne.mockResolvedValue(null);
    const res = await clientGet(makeClientRequest("recBad", VALID_TOKEN), {
      params: Promise.resolve({ accountId: "recBad" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when token does not match", async () => {
    mockFetchOne.mockResolvedValue(mockAccount as never);
    const res = await clientGet(makeClientRequest("rec123", "b".repeat(64)), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/invalid token/i);
  });

  it("returns 200 with safe fields for valid token", async () => {
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockFetch.mockResolvedValue([] as never);
    const res = await clientGet(makeClientRequest("rec123", VALID_TOKEN), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.account.fields.Name).toBe("Acme Corp");
    expect(data.account.fields.Status).toBe("Current");
    expect(data.account.fields.Website).toBe("https://acme.com");
  });

  it("never returns sensitive account fields", async () => {
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockFetch.mockResolvedValue([] as never);
    const res = await clientGet(makeClientRequest("rec123", VALID_TOKEN), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    const data = await res.json();
    expect(data.account.fields["Account Owner"]).toBeUndefined();
    expect(data.account.fields["Engagement Goals"]).toBeUndefined();
    expect(data.account.fields["Address"]).toBeUndefined();
  });

  it("never returns sensitive meeting fields", async () => {
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockFetch
      .mockResolvedValueOnce([] as never) // campaigns
      .mockResolvedValueOnce([
        {
          id: "recM1",
          createdTime: "",
          fields: {
            "Attendee Name": "Bob",
            Account: ["rec123"],
            "Attendee Email": "bob@test.com",
            "Attendee Phone": "555-1234",
            "Attendee LinkedIn": "linkedin.com/bob",
            "Attendee Background": "works at startup",
            "Meeting Taker Email": "jane@a8n.com",
            "Scheduled Meeting Date": "2026-03-01",
          },
        },
      ] as never);
    const res = await clientGet(makeClientRequest("rec123", VALID_TOKEN), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    const data = await res.json();
    const meeting = data.meetings[0];
    expect(meeting.fields["Attendee Email"]).toBeUndefined();
    expect(meeting.fields["Attendee Phone"]).toBeUndefined();
    expect(meeting.fields["Attendee LinkedIn"]).toBeUndefined();
    expect(meeting.fields["Attendee Background"]).toBeUndefined();
    expect(meeting.fields["Meeting Taker Email"]).toBeUndefined();
  });

  it("fetches campaigns and meetings in parallel (both called)", async () => {
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockFetch.mockResolvedValue([] as never);
    await clientGet(makeClientRequest("rec123", VALID_TOKEN), {
      params: Promise.resolve({ accountId: "rec123" }),
    });
    // airtableFetch called twice (campaigns + meetings)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ─── Generate link API tests ──────────────────────────────────────────────────

describe("POST /api/accounts/[id]/generate-link", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockUpdate.mockReset();
    mockAuth.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = "https://a8n-crm.vercel.app";
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await generateLink({} as never, { params: Promise.resolve({ id: "rec123" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown account", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await generateLink({} as never, { params: Promise.resolve({ id: "recBad" }) });
    expect(res.status).toBe(404);
  });

  it("returns dashboardLink on success", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockResolvedValue({} as never);
    const res = await generateLink({} as never, { params: Promise.resolve({ id: "rec123" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dashboardLink).toContain("/client/rec123?token=");
    expect(data.dashboardLink).toContain("https://a8n-crm.vercel.app");
  });

  it("saves Dashboard Link to Airtable", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockResolvedValue({} as never);
    await generateLink({} as never, { params: Promise.resolve({ id: "rec123" }) });
    expect(mockUpdate).toHaveBeenCalledWith(
      "Accounts",
      "rec123",
      expect.objectContaining({ "Dashboard Link": expect.stringContaining("/client/rec123?token=") })
    );
  });
});

// ─── Account creation auto-generates token ────────────────────────────────────

vi.mock("@/lib/airtable", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/airtable")>();
  return {
    ...original,
    airtableFetch: vi.fn(),
    airtableFetchOne: vi.fn(),
    airtableCreate: vi.fn(),
    airtableUpdate: vi.fn(),
  };
});
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

import { airtableCreate } from "@/lib/airtable";
const mockCreate = vi.mocked(airtableCreate);

describe("POST /api/accounts — dashboard link auto-generation", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockAuth.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = "https://a8n-crm.vercel.app";
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("saves Dashboard Link to Airtable after account creation", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { Name: "Acme" }, createdTime: "" } as never);
    mockUpdate.mockResolvedValue({} as never);
    await createAccount(makeRequest({ Name: "Acme" }) as never);
    expect(mockUpdate).toHaveBeenCalledWith(
      "Accounts",
      "recNew",
      expect.objectContaining({ "Dashboard Link": expect.stringContaining("/client/recNew?token=") })
    );
  });

  it("account is still created when token generation fails", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockCreate.mockResolvedValue({ id: "recNew", fields: { Name: "Acme" }, createdTime: "" } as never);
    mockUpdate.mockRejectedValue(new Error("Airtable error"));
    const res = await createAccount(makeRequest({ Name: "Acme" }) as never);
    expect(res.status).toBe(201);
  });
});

// ─── robots.txt content tests ─────────────────────────────────────────────────

describe("robots.txt", () => {
  const robotsPath = join(process.cwd(), "public", "robots.txt");
  let content: string;

  beforeEach(() => {
    content = readFileSync(robotsPath, "utf-8");
  });

  it("disallows /client/ for all user agents", () => {
    expect(content).toContain("User-agent: *");
    expect(content).toContain("Disallow: /client/");
  });

  it("blocks GPTBot entirely", () => {
    expect(content).toMatch(/User-agent: GPTBot[\s\S]*?Disallow: \//m);
  });

  it("blocks ClaudeBot entirely", () => {
    expect(content).toMatch(/User-agent: ClaudeBot[\s\S]*?Disallow: \//m);
  });

  it("blocks CCBot entirely", () => {
    expect(content).toMatch(/User-agent: CCBot[\s\S]*?Disallow: \//m);
  });

  it("blocks Google-Extended entirely", () => {
    expect(content).toMatch(/User-agent: Google-Extended[\s\S]*?Disallow: \//m);
  });
});
