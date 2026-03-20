import { NextRequest } from "next/server";
import { airtableFetchOne } from "@/lib/airtable";
import { AccountFields, MeetingFields } from "@/types";
import { extractTokenFromLink, timingSafeCompare } from "@/lib/token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; meetingId: string }> }
) {
  const { accountId, meetingId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }

  const account = await airtableFetchOne<AccountFields>("Accounts", accountId);
  if (!account) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const storedLink = account.fields["Dashboard Link"];
  const storedToken = storedLink ? extractTokenFromLink(storedLink) : null;
  if (!storedToken || !timingSafeCompare(token, storedToken)) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }

  const meeting = await airtableFetchOne<MeetingFields>("Meetings", meetingId);
  if (!meeting) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Verify meeting belongs to this account
  if (!meeting.fields["Account"]?.includes(accountId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Return safe public fields only — never expose PII or internal notes
  return Response.json({
    id: meeting.id,
    fields: {
      "Attendee Name": meeting.fields["Attendee Name"],
      "Attendee Company": meeting.fields["Attendee Company"],
      "Scheduled Meeting Date": meeting.fields["Scheduled Meeting Date"],
      "Meeting Creation Date": meeting.fields["Meeting Creation Date"],
      "Meeting Taker": meeting.fields["Meeting Taker"],
      "Outcome / Next Steps": meeting.fields["Outcome / Next Steps"],
    },
  }, {
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      "Cache-Control": "no-store, no-cache, private",
    },
  });
}
