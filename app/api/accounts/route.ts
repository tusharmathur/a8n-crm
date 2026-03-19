import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch, airtableCreate, airtableUpdate } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { AccountFields } from "@/types";
import { generateDashboardToken } from "@/lib/token";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await airtableFetch<AccountFields>("Accounts");
    return Response.json(records);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { Name, Status, Website, "Account Owner": accountOwner, "Main Contact Name": mainContact, Address, "Engagement Goals": engagementGoals, "Slack Channel": slackChannel } = body;

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
      ...(engagementGoals && { "Engagement Goals": engagementGoals }),
      ...(slackChannel && { "Slack Channel": slackChannel }),
    };

    const record = await airtableCreate<AccountFields>("Accounts", fields);

    // Auto-generate dashboard link after account creation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const token = generateDashboardToken();
        const dashboardLink = `${appUrl}/client/${record.id}?token=${token}`;
        await airtableUpdate<AccountFields>("Accounts", record.id, { "Dashboard Link": dashboardLink });
        record.fields["Dashboard Link"] = dashboardLink;
      } catch (linkErr) {
        console.error("Failed to generate dashboard link:", linkErr);
      }
    }

    await writeAuditLog({
      action: "Created Account",
      entityType: "Account",
      entityName: Name.trim(),
      entityId: record.id,
      performedBy: session.user?.email ?? "unknown",
      details: fields,
    });

    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to create account" }, { status: 500 });
  }
}
