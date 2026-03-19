import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetchOne: vi.fn(),
  airtableDelete: vi.fn(),
  airtableFetch: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { airtableFetchOne, airtableDelete } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { auth } from "@/auth";
import { DELETE as deleteAccount } from "@/app/api/accounts/[id]/route";
import { DELETE as deleteCampaign } from "@/app/api/campaigns/[id]/route";
import { DELETE as deleteMeeting } from "@/app/api/meetings/[id]/route";

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockDelete = vi.mocked(airtableDelete);
const mockAuditLog = vi.mocked(writeAuditLog);
const mockAuth = vi.mocked(auth);

const mockSession = { user: { email: "user@test.com", name: "Test User" } };
const mockAccount = { id: "rec1", fields: { Name: "Acme Corp" }, createdTime: "" };
const mockCampaign = { id: "rec2", fields: { "Campaign Name": "Spring 2026" }, createdTime: "" };
const mockMeeting = { id: "rec3", fields: { "Attendee Name": "John Doe" }, createdTime: "" };

// ─── Accounts ────────────────────────────────────────────────────────────────

describe("DELETE /api/accounts/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockDelete.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("deletes record and returns 200", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("Accounts", "rec1");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "notfound" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log with full record snapshot before deletion", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockDelete.mockResolvedValue(undefined);
    await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Deleted Account",
        entityType: "Account",
        entityName: "Acme Corp",
        entityId: "rec1",
      })
    );
    // Audit log called before delete
    const auditCallOrder = mockAuditLog.mock.invocationCallOrder[0];
    const deleteCallOrder = mockDelete.mock.invocationCallOrder[0];
    expect(auditCallOrder).toBeLessThan(deleteCallOrder);
  });

  it("audit log failure does not block DELETE response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 on Airtable delete error", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockAccount as never);
    mockDelete.mockRejectedValue(new Error("Airtable error"));
    const res = await deleteAccount(
      {} as Request,
      { params: Promise.resolve({ id: "rec1" }) }
    );
    expect(res.status).toBe(500);
  });
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

describe("DELETE /api/campaigns/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockDelete.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await deleteCampaign(
      {} as Request,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(401);
  });

  it("deletes record and returns 200", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteCampaign(
      {} as Request,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("Campaigns", "rec2");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await deleteCampaign(
      {} as Request,
      { params: Promise.resolve({ id: "notfound" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log before deletion", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockDelete.mockResolvedValue(undefined);
    await deleteCampaign(
      {} as Request,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Deleted Campaign",
        entityType: "Campaign",
        entityId: "rec2",
      })
    );
  });

  it("audit log failure does not block DELETE response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockCampaign as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteCampaign(
      {} as Request,
      { params: Promise.resolve({ id: "rec2" }) }
    );
    expect(res.status).toBe(200);
  });
});

// ─── Meetings ────────────────────────────────────────────────────────────────

describe("DELETE /api/meetings/[id]", () => {
  beforeEach(() => {
    mockFetchOne.mockReset();
    mockDelete.mockReset();
    mockAuditLog.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await deleteMeeting(
      {} as Request,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(401);
  });

  it("deletes record and returns 200", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteMeeting(
      {} as Request,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("Meetings", "rec3");
  });

  it("returns 404 for unknown ID", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(null);
    const res = await deleteMeeting(
      {} as Request,
      { params: Promise.resolve({ id: "notfound" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes audit log before deletion", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockDelete.mockResolvedValue(undefined);
    await deleteMeeting(
      {} as Request,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "Deleted Meeting",
        entityType: "Meeting",
        entityId: "rec3",
      })
    );
  });

  it("audit log failure does not block DELETE response", async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    mockFetchOne.mockResolvedValue(mockMeeting as never);
    mockAuditLog.mockRejectedValue(new Error("audit failed"));
    mockDelete.mockResolvedValue(undefined);
    const res = await deleteMeeting(
      {} as Request,
      { params: Promise.resolve({ id: "rec3" }) }
    );
    expect(res.status).toBe(200);
  });
});
