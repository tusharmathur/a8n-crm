import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AccountFields, Account } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function AccountsPage() {
  const session = await auth();
  const accounts: Account[] = await airtableFetch<AccountFields>("Accounts");

  return (
    <div>
      <TopBar title="Accounts" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Accounts</h2>
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
          <div className="mt-4 bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Account Owner</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Address</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Primary Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, i) => (
                  <tr
                    key={account.id}
                    className={`hover:bg-[#F8FAFC] ${i < accounts.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-semibold text-[#1E293B] hover:text-[#F97316]"
                      >
                        {account.fields["Name"]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {account.fields["Status"] && (
                        <Badge value={account.fields["Status"]}>
                          {account.fields["Status"]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {account.fields["Account Owner"] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {account.fields["Address"] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {account.fields["Main Contact Name"] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/accounts/${account.id}`}>
                          <button className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#1E293B] hover:bg-[#F8FAFC]">
                            View
                          </button>
                        </Link>
                        <Link href={`/accounts/${account.id}/edit`}>
                          <button className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#1E293B] hover:bg-[#F8FAFC]">
                            Edit
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
