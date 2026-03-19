import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch, airtableCreate } from "@/lib/airtable";
import { writeAuditLog } from "@/lib/audit";
import { AccountFields } from "@/types";

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
    const { Name, Status, Website, "Account Owner": accountOwner, "Main Contact Name": mainContact, Address, "Engagement Goals": engagementGoals } = body;

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
    };

    const record = await airtableCreate<AccountFields>("Accounts", fields);

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
