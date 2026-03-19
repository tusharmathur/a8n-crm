import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { airtableFetchOne } from "@/lib/airtable";
import { AccountFields } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { AccountForm } from "@/components/forms/AccountForm";
import { Card } from "@/components/ui/Card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const account = await airtableFetchOne<AccountFields>("Accounts", id);
  if (!account) notFound();

  return (
    <div>
      <TopBar title="Edit Account" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6">Edit Account</h2>
          <AccountForm mode="edit" initialValues={account} recordId={id} />
        </Card>
      </div>
    </div>
  );
}
