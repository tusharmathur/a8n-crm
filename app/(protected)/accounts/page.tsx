import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, Account } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { AccountsTable } from "@/components/tables/AccountsTable";

export default async function AccountsPage() {
  const session = await auth();
  const accounts: Account[] = await airtableFetch<AccountFields>("Accounts");

  return (
    <div>
      <TopBar title="Accounts" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-[#1E1B4B]">Accounts</h2>
            <p className="text-sm text-[#64748B]">{accounts.length} accounts</p>
          </div>
          <Link href="/accounts/new">
            <Button variant="primary">+ New Account</Button>
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-16 text-center text-[#94A3B8]">
            No accounts yet. Add your first account.
          </div>
        ) : (
          <AccountsTable accounts={accounts} />
        )}
      </div>
    </div>
  );
}
