import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, Account } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalDashboardClient } from "@/components/dashboard/GlobalDashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const accounts: Account[] = await airtableFetch<AccountFields>("Accounts");

  return (
    <div>
      <TopBar title="Dashboard" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <GlobalDashboardClient accounts={accounts} />
      </div>
    </div>
  );
}
