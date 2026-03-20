import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, Account } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { CampaignForm } from "@/components/forms/CampaignForm";

export default async function NewCampaignPage() {
  const session = await auth();
  const accounts: Account[] = await airtableFetch<AccountFields>("Accounts");

  return (
    <div>
      <TopBar title="New Campaign" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E1B4B] mb-6">Create Campaign</h2>
          <CampaignForm accounts={accounts} />
        </Card>
      </div>
    </div>
  );
}
