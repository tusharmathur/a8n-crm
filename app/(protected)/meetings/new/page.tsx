import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, CampaignFields, Account, Campaign } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { MeetingForm } from "@/components/forms/MeetingForm";

export default async function NewMeetingPage() {
  const session = await auth();

  const [accountRecords, campaignRecords] = await Promise.all([
    airtableFetch<AccountFields>("Accounts"),
    airtableFetch<CampaignFields>("Campaigns"),
  ]);

  const accounts = accountRecords as Account[];
  const campaigns = campaignRecords as Campaign[];

  return (
    <div>
      <TopBar title="New Meeting" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E1B4B] mb-6">Create Meeting</h2>
          <MeetingForm accounts={accounts} campaigns={campaigns} />
        </Card>
      </div>
    </div>
  );
}
