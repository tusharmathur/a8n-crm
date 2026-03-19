import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { MeetingFields, AccountFields, CampaignFields } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const record = await airtableFetchOne<MeetingFields>("Meetings", id);
    if (!record) return Response.json({ error: "Meeting not found" }, { status: 404 });

    // Enrich with account and campaign names
    let accountName: string | undefined;
    let campaignName: string | undefined;
    const accountId = record.fields["Account"]?.[0];
    const campaignId = record.fields["Campaign"]?.[0];
    if (accountId) {
      const acc = await airtableFetchOne<AccountFields>("Accounts", accountId);
      accountName = acc?.fields["Name"];
    }
    if (campaignId) {
      const camp = await airtableFetchOne<CampaignFields>("Campaigns", campaignId);
      campaignName = camp?.fields["Campaign Name"];
    }

    return Response.json({ ...record, accountName, campaignName });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch meeting" }, { status: 500 });
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

    const current = await airtableFetchOne<MeetingFields>("Meetings", id);
    if (!current) return Response.json({ error: "Meeting not found" }, { status: 404 });

    const body = await request.json();
    const {
      "Attendee Name": attendeeName,
      Account: accountIds,
      Campaign: campaignIds,
      "Meeting Creation Date": meetingCreationDate,
      "Meeting Taker": meetingTaker,
      "Meeting Taker Email": meetingTakerEmail,
      "Scheduled Meeting Date": scheduledDate,
      "Attendee Email": attendeeEmail,
      "Attendee Phone": attendeePhone,
      "Attendee LinkedIn": attendeeLinkedIn,
      "Attendee Website": attendeeWebsite,
      "Attendee Company": attendeeCompany,
      "Attendee Background": attendeeBackground,
    } = body;

    if (!attendeeName?.trim()) {
      return Response.json({ error: "Attendee Name is required" }, { status: 400 });
    }
    if (!accountIds?.length) {
      return Response.json({ error: "Account is required" }, { status: 400 });
    }
    if (!campaignIds?.length) {
      return Response.json({ error: "Campaign is required" }, { status: 400 });
    }

    const fields: Partial<MeetingFields> = {
      "Attendee Name": attendeeName.trim(),
      Account: accountIds,
      Campaign: campaignIds,
      ...(meetingCreationDate && { "Meeting Creation Date": meetingCreationDate }),
      ...(meetingTaker && { "Meeting Taker": meetingTaker }),
      ...(meetingTakerEmail && { "Meeting Taker Email": meetingTakerEmail }),
      ...(scheduledDate && { "Scheduled Meeting Date": scheduledDate }),
      ...(attendeeEmail && { "Attendee Email": attendeeEmail }),
      ...(attendeePhone && { "Attendee Phone": attendeePhone }),
      ...(attendeeLinkedIn && { "Attendee LinkedIn": attendeeLinkedIn }),
      ...(attendeeWebsite && { "Attendee Website": attendeeWebsite }),
      ...(attendeeCompany && { "Attendee Company": attendeeCompany }),
      ...(attendeeBackground && { "Attendee Background": attendeeBackground }),
    };

    // Snapshot before values for audit log
    const before: Partial<MeetingFields> = {};
    const after: Partial<MeetingFields> = {};
    for (const key of Object.keys(fields) as (keyof MeetingFields)[]) {
      const oldVal = current.fields[key];
      const newVal = fields[key];
      const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? "");
      const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? "");
      if (oldStr !== newStr) {
        (before as Record<string, unknown>)[key] = oldVal;
        (after as Record<string, unknown>)[key] = newVal;
      }
    }

    const updated = await airtableUpdate<MeetingFields>("Meetings", id, fields);

    try {
      await writeAuditLog({
        action: "Updated Meeting",
        entityType: "Meeting",
        entityName: attendeeName.trim(),
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
    return Response.json({ error: "Failed to update meeting" }, { status: 500 });
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

    const record = await airtableFetchOne<MeetingFields>("Meetings", id);
    if (!record) return Response.json({ error: "Meeting not found" }, { status: 404 });

    try {
      await writeAuditLog({
        action: "Deleted Meeting",
        entityType: "Meeting",
        entityName: record.fields["Attendee Name"],
        entityId: id,
        performedBy: session.user?.email ?? "unknown",
        details: { snapshot: record.fields },
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    await airtableDelete("Meetings", id);
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
