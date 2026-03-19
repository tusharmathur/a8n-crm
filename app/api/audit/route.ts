import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AuditLogFields } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await airtableFetch<AuditLogFields>("Audit Log");

    // Sort newest first
    const sorted = records.sort((a, b) => {
      const dateA = a.fields["Performed At"] ?? a.createdTime;
      const dateB = b.fields["Performed At"] ?? b.createdTime;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return Response.json(sorted);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
