import { NextRequest } from "next/server";
import { airtableFetchOne, airtableFetch } from "@/lib/airtable";
import { AccountFields, CampaignFields, MeetingFields } from "@/types";
import { extractTokenFromLink, timingSafeCompare } from "@/lib/token";

// Simple in-memory rate limiter (resets per lambda instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { accountId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }

  const account = await airtableFetchOne<AccountFields>("Accounts", accountId);
  if (!account) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  const storedLink = account.fields["Dashboard Link"];
  const storedToken = storedLink ? extractTokenFromLink(storedLink) : null;
  if (!storedToken || !timingSafeCompare(token, storedToken)) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }

  // Fetch campaigns and meetings in parallel, filter by account ID in JS
  const [allCampaigns, allMeetings] = await Promise.all([
    airtableFetch<CampaignFields>("Campaigns"),
    airtableFetch<MeetingFields>("Meetings"),
  ]);

  const campaigns = allCampaigns
    .filter((c) => c.fields["Account"]?.includes(accountId))
    .map((c) => ({
      id: c.id,
      fields: {
        "Campaign Name": c.fields["Campaign Name"],
        "Requests Sent": c.fields["Requests Sent"],
        "Requests Accepted": c.fields["Requests Accepted"],
        Replies: c.fields["Replies"],
        "Acceptance Rate": c.fields["Acceptance Rate"],
        "Reply Rate": c.fields["Reply Rate"],
      },
    }));

  const meetings = allMeetings
    .filter((m) => m.fields["Account"]?.includes(accountId))
    .map((m) => ({
      id: m.id,
      fields: {
        "Attendee Name": m.fields["Attendee Name"],
        "Scheduled Meeting Date": m.fields["Scheduled Meeting Date"],
        "Outcome / Next Steps": m.fields["Outcome / Next Steps"],
      },
    }));

  return Response.json({
    account: {
      id: account.id,
      fields: {
        Name: account.fields["Name"],
        Status: account.fields["Status"],
        Website: account.fields["Website"],
      },
    },
    campaigns,
    meetings,
  });
}
