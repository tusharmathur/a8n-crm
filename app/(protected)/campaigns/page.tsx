import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne } from "@/lib/airtable";
import { CampaignFields, AccountFields, Campaign } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";

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
            <h2 className="text-xl font-bold text-[#1E293B]">Campaigns</h2>
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
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Campaign Name</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Account</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Requests Sent</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Accepted</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Replies</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Acceptance Rate</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Reply Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-[#F8FAFC] ${i < campaigns.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1E293B]">
                      {c.fields["Campaign Name"]}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{c.accountName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Requests Sent"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Requests Accepted"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Replies"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Acceptance Rate"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Reply Rate"] ?? "—"}</td>
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
