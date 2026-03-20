import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne } from "@/lib/airtable";
import { CampaignFields, AccountFields, Campaign } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { CampaignsTable } from "@/components/tables/CampaignsTable";

export default async function CampaignsPage() {
  const session = await auth();

  const records = await airtableFetch<CampaignFields>("Campaigns");
  const campaigns: Campaign[] = await Promise.all(
    records.map(async (r) => {
      const accountIds = r.fields["Account"] ?? [];
      let accountName: string | undefined;
      if (accountIds[0]) {
        const acc = await airtableFetchOne<AccountFields>("Accounts", accountIds[0]);
        accountName = acc?.fields["Name"];
      }
      return { ...r, accountName };
    })
  );

  return (
    <div>
      <TopBar title="Campaigns" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E1B4B]">Campaigns</h2>
            <p className="text-sm text-[#64748B]">{campaigns.length} campaigns</p>
          </div>
          <Link href="/campaigns/new">
            <Button variant="primary">+ New Campaign</Button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="mt-16 text-center text-[#94A3B8]">
            No campaigns yet. Add your first campaign.
          </div>
        ) : (
          <CampaignsTable campaigns={campaigns} />
        )}
      </div>
    </div>
  );
}
