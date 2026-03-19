import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne } from "@/lib/airtable";
import { MeetingFields, AccountFields, CampaignFields, Meeting } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { MeetingsTable } from "@/components/tables/MeetingsTable";

export default async function MeetingsPage() {
  const session = await auth();

  const records = await airtableFetch<MeetingFields>("Meetings");
  const meetings: Meeting[] = await Promise.all(
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

  // Sort newest first
  const sorted = meetings.sort((a, b) => {
    const dA = a.fields["Scheduled Meeting Date"] ?? "";
    const dB = b.fields["Scheduled Meeting Date"] ?? "";
    return dB.localeCompare(dA);
  });

  return (
    <div>
      <TopBar title="Meetings" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Meetings</h2>
            <p className="text-sm text-[#64748B]">{meetings.length} meetings</p>
          </div>
          <Link href="/meetings/new">
            <Button variant="primary">+ New Meeting</Button>
          </Link>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-16 text-center text-[#94A3B8]">
            No meetings yet. Add your first meeting.
          </div>
        ) : (
          <MeetingsTable meetings={sorted} />
        )}
      </div>
    </div>
  );
}
