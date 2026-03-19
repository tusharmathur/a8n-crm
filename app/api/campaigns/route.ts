import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne, airtableCreate } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { CampaignFields, AccountFields } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await airtableFetch<CampaignFields>("Campaigns");

    // Enrich with account names
    const enriched = await Promise.all(
      records.map(async (r) => {
        const accountIds = r.fields["Account"] ?? [];
        let accountName: string | undefined;
        if (accountIds[0]) {
          const acc = await airtableFetchOne<AccountFields>("Accounts", accountIds[0]);
          accountName = acc?.fields["Name"];
        }
        return { ...r, accountName };
      })
    );

    return Response.json(enriched);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
      ...(requestsSent !== undefined && { "Requests Sent": Number(requestsSent) }),
      ...(requestsAccepted !== undefined && { "Requests Accepted": Number(requestsAccepted) }),
      ...(Replies !== undefined && { Replies: Number(Replies) }),
    };

    const record = await airtableCreate<CampaignFields>("Campaigns", fields);

    await writeAuditLog({
      action: "Created Campaign",
      entityType: "Campaign",
      entityName: campaignName.trim(),
      entityId: record.id,
      performedBy: session.user?.email ?? "unknown",
      details: fields,
    });

    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
