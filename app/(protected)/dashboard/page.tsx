import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, MeetingFields, Account, Meeting } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalDashboardClient } from "@/components/dashboard/GlobalDashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  const [accountRecords, meetingRecords] = await Promise.all([
    airtableFetch<AccountFields>("Accounts"),
    airtableFetch<MeetingFields>("Meetings"),
  ]);

  const accounts: Account[] = accountRecords;

  // Build a quick lookup for account/campaign names
  const accountMap = new Map(accountRecords.map((a) => [a.id, a.fields["Name"]]));

  // Enrich meetings with accountName (no per-record fetch needed — use the already-fetched list)
  const meetings: Meeting[] = meetingRecords.map((m) => {
    const accountId = m.fields["Account"]?.[0];
    return {
      ...m,
      accountName: accountId ? accountMap.get(accountId) : undefined,
    };
  });

  return (
    <div>
      <TopBar title="Dashboard" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <GlobalDashboardClient accounts={accounts} initialMeetings={meetings} />
      </div>
    </div>
  );
}
