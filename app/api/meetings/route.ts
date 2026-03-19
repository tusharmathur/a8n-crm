import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne, airtableCreate } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { MeetingFields, AccountFields, CampaignFields } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get("accountId");

    let filterFormula: string | undefined;
    if (accountId) {
      filterFormula = `FIND("${accountId}", ARRAYJOIN({Account}))`;
    }

    const records = await airtableFetch<MeetingFields>("Meetings", filterFormula);

    // Enrich with account + campaign names
    const enriched = await Promise.all(
      records.map(async (r) => {
        const accountIds = r.fields["Account"] ?? [];
        const campaignIds = r.fields["Campaign"] ?? [];

        let accountName: string | undefined;
        let campaignName: string | undefined;

        if (accountIds[0]) {
          const acc = await airtableFetchOne<AccountFields>("Accounts", accountIds[0]);
          accountName = acc?.fields["Name"];
        }
        if (campaignIds[0]) {
          const camp = await airtableFetchOne<CampaignFields>("Campaigns", campaignIds[0]);
          campaignName = camp?.fields["Campaign Name"];
        }

        return { ...r, accountName, campaignName };
      })
    );

    return Response.json(enriched);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      "Attendee Name": attendeeName,
      Account: accountIds,
      Campaign: campaignIds,
      "Meeting Taker": meetingTaker,
      "Meeting Taker Email": meetingTakerEmail,
      "Scheduled Meeting Date": scheduledDate,
      "Attendee Email": attendeeEmail,
      "Attendee Phone": attendeePhone,
      "Attendee LinkedIn": attendeeLinkedIn,
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
      ...(meetingTaker && { "Meeting Taker": meetingTaker }),
      ...(meetingTakerEmail && { "Meeting Taker Email": meetingTakerEmail }),
      ...(scheduledDate && { "Scheduled Meeting Date": scheduledDate }),
      ...(attendeeEmail && { "Attendee Email": attendeeEmail }),
      ...(attendeePhone && { "Attendee Phone": attendeePhone }),
      ...(attendeeLinkedIn && { "Attendee LinkedIn": attendeeLinkedIn }),
      ...(attendeeCompany && { "Attendee Company": attendeeCompany }),
      ...(attendeeBackground && { "Attendee Background": attendeeBackground }),
    };

    const record = await airtableCreate<MeetingFields>("Meetings", fields);

    await writeAuditLog({
      action: "Created Meeting",
      entityType: "Meeting",
      entityName: attendeeName.trim(),
      entityId: record.id,
      performedBy: session.user?.email ?? "unknown",
      details: fields,
    });

    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
