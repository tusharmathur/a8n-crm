import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeAuditLog } from "@/lib/audit";

vi.mock("@/lib/airtable", () => ({
  airtableCreate: vi.fn(),
}));

import { airtableCreate } from "@/lib/airtable";
const mockCreate = vi.mocked(airtableCreate);

describe("writeAuditLog", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("creates a record with all 7 fields", async () => {
    mockCreate.mockResolvedValue({} as never);
    const before = new Date().toISOString();

    await writeAuditLog({
      action: "Created Account",
      entityType: "Account",
      entityName: "Acme Corp",
      entityId: "recABC123",
      performedBy: "user@example.com",
      details: { Name: "Acme Corp" },
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const [table, fields] = mockCreate.mock.calls[0];
    expect(table).toBe("Audit Log");
    expect(fields["Action"]).toBe("Created Account");
    expect(fields["Entity Type"]).toBe("Account");
    expect(fields["Entity Name"]).toBe("Acme Corp");
    expect(fields["Entity ID"]).toBe("recABC123");
    expect(fields["Performed By"]).toBe("user@example.com");
    expect(fields["Details"]).toBe(JSON.stringify({ Name: "Acme Corp" }));

    // Performed At is a valid ISO timestamp after the test started
    const performedAt = new Date(fields["Performed At"]);
    expect(performedAt.toISOString()).toBe(fields["Performed At"]);
    expect(new Date(fields["Performed At"]) >= new Date(before)).toBe(true);
  });

  it("Details field contains valid JSON string", async () => {
    mockCreate.mockResolvedValue({} as never);
    await writeAuditLog({
      action: "Created Campaign",
      entityType: "Campaign",
      entityName: "Q1 Push",
      entityId: "recXYZ",
      performedBy: "admin@test.com",
      details: { "Campaign Name": "Q1 Push", Account: ["recABC"] },
    });

    const [, fields] = mockCreate.mock.calls[0];
    expect(() => JSON.parse(fields["Details"])).not.toThrow();
  });

  it("does not throw when Airtable fails — resolves silently", async () => {
    mockCreate.mockRejectedValue(new Error("Airtable down"));

    await expect(
      writeAuditLog({
        action: "Created Meeting",
        entityType: "Meeting",
        entityName: "Jane",
        entityId: "recM1",
        performedBy: "user@x.com",
      })
    ).resolves.toBeUndefined();
  });

  it("always resolves, never rejects", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));

    const result = writeAuditLog({
      action: "Test",
      entityType: "Account",
      entityName: "Test",
      entityId: "rec1",
      performedBy: "test@test.com",
    });

    await expect(result).resolves.not.toThrow();
  });
});
