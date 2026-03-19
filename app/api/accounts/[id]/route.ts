import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { AccountFields } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const record = await airtableFetchOne<AccountFields>("Accounts", id);
    if (!record) return Response.json({ error: "Account not found" }, { status: 404 });
    return Response.json(record);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch account" }, { status: 500 });
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

    const current = await airtableFetchOne<AccountFields>("Accounts", id);
    if (!current) return Response.json({ error: "Account not found" }, { status: 404 });

    const body = await request.json();
    const {
      Name,
      Status,
      Website,
      "Account Owner": accountOwner,
      "Main Contact Name": mainContact,
      Address,
      "Engagement Goals": goals,
      "Slack Channel": slackChannel,
    } = body;

    if (!Name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const fields: Partial<AccountFields> = {
      Name: Name.trim(),
      ...(Status && { Status }),
      ...(Website && { Website }),
      ...(accountOwner && { "Account Owner": accountOwner }),
      ...(mainContact && { "Main Contact Name": mainContact }),
      ...(Address && { Address }),
      ...(goals && { "Engagement Goals": goals }),
      ...(slackChannel && { "Slack Channel": slackChannel }),
    };

    // Snapshot before values for audit log
    const before: Partial<AccountFields> = {};
    const after: Partial<AccountFields> = {};
    for (const key of Object.keys(fields) as (keyof AccountFields)[]) {
      const oldVal = current.fields[key];
      const newVal = fields[key];
      if (oldVal !== newVal) {
        (before as Record<string, unknown>)[key] = oldVal;
        (after as Record<string, unknown>)[key] = newVal;
      }
    }

    const updated = await airtableUpdate<AccountFields>("Accounts", id, fields);

    try {
      await writeAuditLog({
        action: "Updated Account",
        entityType: "Account",
        entityName: Name.trim(),
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
    return Response.json({ error: "Failed to update account" }, { status: 500 });
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

    const record = await airtableFetchOne<AccountFields>("Accounts", id);
    if (!record) return Response.json({ error: "Account not found" }, { status: 404 });

    try {
      await writeAuditLog({
        action: "Deleted Account",
        entityType: "Account",
        entityName: record.fields["Name"],
        entityId: id,
        performedBy: session.user?.email ?? "unknown",
        details: { snapshot: record.fields },
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    await airtableDelete("Accounts", id);
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
