import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetchOne: vi.fn(),
  airtableUpdate: vi.fn(),
  airtableFetch: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetchOne, airtableUpdate } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { auth } from "@/auth";
import { GET as getAccount, PATCH as patchAccount } from "@/app/api/accounts/[id]/route";
import { GET as getCampaign, PATCH as patchCampaign } from "@/app/api/campaigns/[id]/route";
import { GET as getMeeting, PATCH as patchMeeting } from "@/app/api/meetings/[id]/route";

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockUpdate = vi.mocked(airtableUpdate);
const mockAuditLog = vi.mocked(writeAuditLog);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "user@test.com", name: "Test User" } };
const mockAccount = {
  id: "rec1",
  fields: { Name: "Acme Corp", Status: "Current" as const },
  createdTime: "",
};
const mockCampaign = {
  id: "rec2",
  fields: { "Campaign Name": "Spring 2026", Account: ["rec1"] },
  createdTime: "",
};
const mockMeeting = {
  id: "rec3",
  fields: { "Attendee Name": "John Doe", Account: ["rec1"], Campaign: ["rec2"] },
  createdTime: "",
};

const makePatch = (url: string, body: Record<string, unknown>) =>
  new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Accounts ────────────────────────────────────────────────────────────────

describe("GET /api/accounts/[id]", () => {
  beforeEach(() => { mockFetchOne.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getAccount({} as Request, { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(401);
  });

  it("returns account record", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    const res = await getAccount({} as Request, { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("rec1");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await getAccount({} as Request, { params: Promise.resolve({ id: "notfound" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/accounts/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockUpdate.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "Updated" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("updates account with valid body", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockResolvedValue({ ...mockAccount, fields: { Name: "Updated Corp" } } as never);
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "Updated Corp" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when record not found", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "Test" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log with before/after on successful update", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockResolvedValue({ ...mockAccount, fields: { Name: "New Name" } } as never);
    await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "New Name" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Updated Account",
        entityType: "Account",
        entityId: "rec1",
      })
    );
  });

  it("audit log failure does not block PATCH response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockResolvedValue({ ...mockAccount, fields: { Name: "New Name" } } as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "New Name" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 on Airtable error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockUpdate.mockRejectedValue(new Error("Airtable error"));
    const res = await patchAccount(
      makePatch("http://localhost/api/accounts/rec1", { Name: "Test" }) as never,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(500);
  });
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

describe("GET /api/campaigns/[id]", () => {
  beforeEach(() => { mockFetchOne.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getCampaign({} as Request, { params: Promise.resolve({ id: "rec2" }) });
    expect(res.status).toBe(401);
  });

  it("returns campaign record", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    const res = await getCampaign({} as Request, { params: Promise.resolve({ id: "rec2" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("rec2");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await getCampaign({} as Request, { params: Promise.resolve({ id: "notfound" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/campaigns/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockUpdate.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "Updated", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(401);
  });

  it("updates campaign with valid body", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockUpdate.mockResolvedValue({ ...mockCampaign, fields: { "Campaign Name": "Updated" } } as never);
    const res = await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "Updated", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when Campaign Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    const res = await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when record not found", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "Test", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log on successful update", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockUpdate.mockResolvedValue({ ...mockCampaign, fields: { "Campaign Name": "Updated" } } as never);
    await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "Updated", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "Updated Campaign", entityType: "Campaign" })
    );
  });

  it("audit log failure does not block PATCH response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockUpdate.mockResolvedValue({ ...mockCampaign } as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    const res = await patchCampaign(
      makePatch("http://localhost/api/campaigns/rec2", { "Campaign Name": "Test", Account: ["rec1"] }) as never,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(200);
  });
});

// ─── Meetings ────────────────────────────────────────────────────────────────

describe("GET /api/meetings/[id]", () => {
  beforeEach(() => { mockFetchOne.mockReset(); mockAuth.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getMeeting({} as Request, { params: Promise.resolve({ id: "rec3" }) });
    expect(res.status).toBe(401);
  });

  it("returns meeting record", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    const res = await getMeeting({} as Request, { params: Promise.resolve({ id: "rec3" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("rec3");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await getMeeting({} as Request, { params: Promise.resolve({ id: "notfound" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/meetings/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockUpdate.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "Jane Doe",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(401);
  });

  it("updates meeting with valid body", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockUpdate.mockResolvedValue({ ...mockMeeting, fields: { "Attendee Name": "Jane Doe" } } as never);
    const res = await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "Jane Doe",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when Attendee Name is missing", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    const res = await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when record not found", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "Jane",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log on successful update", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockUpdate.mockResolvedValue({ ...mockMeeting } as never);
    await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "Jane",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "Updated Meeting", entityType: "Meeting" })
    );
  });

  it("audit log failure does not block PATCH response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockUpdate.mockResolvedValue({ ...mockMeeting } as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    const res = await patchMeeting(
      makePatch("http://localhost/api/meetings/rec3", {
        "Attendee Name": "Jane",
        Account: ["rec1"],
        Campaign: ["rec2"],
      }) as never,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(200);
  });
});
