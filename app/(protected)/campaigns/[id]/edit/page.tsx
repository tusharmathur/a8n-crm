import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { airtableFetchOne, airtableFetch } from "@/lib/airtable";
import { CampaignFields, AccountFields, Campaign } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { CampaignForm } from "@/components/forms/CampaignForm";
import { Card } from "@/components/ui/Card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [record, accounts] = await Promise.all([
    airtableFetchOne<CampaignFields>("Campaigns", id),
    airtableFetch<AccountFields>("Accounts"),
  ]);

  if (!record) notFound();

  const campaign: Campaign = { ...record };

  return (
    <div>
      <TopBar title="Edit Campaign" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6">Edit Campaign</h2>
          <CampaignForm mode="edit" initialValues={campaign} recordId={id} accounts={accounts} />
        </Card>
      </div>
    </div>
  );
}
