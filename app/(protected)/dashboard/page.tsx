import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, MeetingFields, CampaignFields, Account, Meeting, Campaign } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalDashboardClient } from "@/components/dashboard/GlobalDashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  const [accountRecords, meetingRecords, campaignRecords] = await Promise.all([
    airtableFetch<AccountFields>("Accounts"),
    airtableFetch<MeetingFields>("Meetings"),
    airtableFetch<CampaignFields>("Campaigns"),
  ]);

  const accounts: Account[] = accountRecords;
  const accountMap = new Map(accountRecords.map((a) => [a.id, a.fields["Name"]]));

  const meetings: Meeting[] = meetingRecords.map((m) => {
    const accountId = m.fields["Account"]?.[0];
    return { ...m, accountName: accountId ? accountMap.get(accountId) : undefined };
  });

  const campaigns: Campaign[] = campaignRecords.map((c) => {
    const accountId = c.fields["Account"]?.[0];
    return { ...c, accountName: accountId ? accountMap.get(accountId) : undefined };
  });

  return (
    <div>
      <TopBar title="Dashboard" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <GlobalDashboardClient accounts={accounts} initialMeetings={meetings} initialCampaigns={campaigns} />
      </div>
    </div>
  );
}
