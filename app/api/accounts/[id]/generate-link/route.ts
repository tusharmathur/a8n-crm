import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne, airtableUpdate } from "@/lib/airtable";
import { AccountFields } from "@/types";
import { generateDashboardToken } from "@/lib/token";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const account = await airtableFetchOne<AccountFields>("Accounts", id);
    if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const token = generateDashboardToken();
    const dashboardLink = `${appUrl}/client/${id}?token=${token}`;

    await airtableUpdate<AccountFields>("Accounts", id, { "Dashboard Link": dashboardLink });

    return Response.json({ dashboardLink });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to generate dashboard link" }, { status: 500 });
  }
}
