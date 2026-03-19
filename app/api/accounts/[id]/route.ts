import { auth } from "@/auth";
import { airtableFetchOne } from "@/lib/airtable";
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
