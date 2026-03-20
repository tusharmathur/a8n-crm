import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { airtableFetchOne, airtableFetch } from "@/lib/airtable";
import { MeetingFields, AccountFields, CampaignFields, Meeting } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { MeetingForm } from "@/components/forms/MeetingForm";
import { Card } from "@/components/ui/Card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditMeetingPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [record, accounts, campaigns] = await Promise.all([
    airtableFetchOne<MeetingFields>("Meetings", id),
    airtableFetch<AccountFields>("Accounts"),
    airtableFetch<CampaignFields>("Campaigns"),
  ]);

  if (!record) notFound();

  const meeting: Meeting = { ...record };

  return (
    <div>
      <TopBar title="Edit Meeting" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E1B4B] mb-6">Edit Meeting</h2>
          <MeetingForm mode="edit" initialValues={meeting} recordId={id} accounts={accounts} campaigns={campaigns} />
        </Card>
      </div>
    </div>
  );
}
