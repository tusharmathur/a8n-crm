import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { CampaignFields, AccountFields } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const record = await airtableFetchOne<CampaignFields>("Campaigns", id);
    if (!record) return Response.json({ error: "Campaign not found" }, { status: 404 });

    // Enrich with account name
    let accountName: string | undefined;
    const accountId = record.fields["Account"]?.[0];
    if (accountId) {
      const acc = await airtableFetchOne<AccountFields>("Accounts", accountId);
      accountName = acc?.fields["Name"];
    }

    return Response.json({ ...record, accountName });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const current = await airtableFetchOne<CampaignFields>("Campaigns", id);
    if (!current) return Response.json({ error: "Campaign not found" }, { status: 404 });

    const body = await request.json();
    const {
      "Campaign Name": campaignName,
      Account: accountIds,
      Purpose,
      "Requests Sent": requestsSent,
      "Requests Accepted": requestsAccepted,
      Replies,
    } = body;

    if (!campaignName?.trim()) {
      return Response.json({ error: "Campaign Name is required" }, { status: 400 });
    }
    if (!accountIds?.length) {
      return Response.json({ error: "Account is required" }, { status: 400 });
    }

    const fields: Partial<CampaignFields> = {
      "Campaign Name": campaignName.trim(),
      Account: accountIds,
      ...(Purpose && { Purpose }),
      ...(requestsSent !== undefined && requestsSent !== "" && { "Requests Sent": Number(requestsSent) }),
      ...(requestsAccepted !== undefined && requestsAccepted !== "" && { "Requests Accepted": Number(requestsAccepted) }),
      ...(Replies !== undefined && Replies !== "" && { Replies: Number(Replies) }),
    };

    // Snapshot before values for audit log
    const before: Partial<CampaignFields> = {};
    const after: Partial<CampaignFields> = {};
    for (const key of Object.keys(fields) as (keyof CampaignFields)[]) {
      const oldVal = current.fields[key];
      const newVal = fields[key];
      const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? "");
      const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? "");
      if (oldStr !== newStr) {
        (before as Record<string, unknown>)[key] = oldVal;
        (after as Record<string, unknown>)[key] = newVal;
      }
    }

    const updated = await airtableUpdate<CampaignFields>("Campaigns", id, fields);

    try {
      await writeAuditLog({
        action: "Updated Campaign",
        entityType: "Campaign",
        entityName: campaignName.trim(),
        entityId: id,
        performedBy: session.user?.email ?? "unknown",
        details: { before, after },
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    return Response.json(updated);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const record = await airtableFetchOne<CampaignFields>("Campaigns", id);
    if (!record) return Response.json({ error: "Campaign not found" }, { status: 404 });

    try {
      await writeAuditLog({
        action: "Deleted Campaign",
        entityType: "Campaign",
        entityName: record.fields["Campaign Name"],
        entityId: id,
        performedBy: session.user?.email ?? "unknown",
        details: { snapshot: record.fields },
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    await airtableDelete("Campaigns", id);
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
