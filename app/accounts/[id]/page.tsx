import { Metadata } from "next";
import { airtableFetchOne, airtableFetch } from "@/lib/airtable";
import { AccountFields, MeetingFields, CampaignFields, Meeting } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { AccountDashboardClient } from "@/components/dashboard/AccountDashboardClient";
import Link from "next/link";
import Image from "next/image";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const account = await airtableFetchOne<AccountFields>("Accounts", id);
  return {
    title: account ? `${account.fields["Name"]} | A8N CRM` : "Account | A8N CRM",
    openGraph: { title: account?.fields["Name"] },
  };
}

export default async function AccountDashboardPage({ params }: Props) {
  const { id } = await params;

  const account = await airtableFetchOne<AccountFields>("Accounts", id);

  if (!account) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-10 text-center shadow-sm">
          <p className="text-[#1E293B] font-semibold mb-4">Account not found</p>
          <Link href="/accounts" className="text-sm text-[#0EA5E9] hover:underline">
            ← Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  // Fetch meetings for this account
  const allMeetings = await airtableFetch<MeetingFields>(
    "Meetings",
    `FIND("${id}", ARRAYJOIN({Account}))`
  );

  // Enrich meetings with campaign names
  const meetings: Meeting[] = await Promise.all(
    allMeetings.map(async (m) => {
      const campaignIds = m.fields["Campaign"] ?? [];
      let campaignName: string | undefined;
      if (campaignIds[0]) {
        const camp = await airtableFetchOne<CampaignFields>("Campaigns", campaignIds[0]);
        campaignName = camp?.fields["Campaign Name"];
      }
      return { ...m, accountName: account.fields["Name"], campaignName };
    })
  );

  const fields = account.fields;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Minimal header for public page */}
      <header className="bg-white border-b border-[#E2E8F0] h-14 flex items-center px-6">
        <Link href="/accounts" className="flex items-center gap-2">
          <Image
            src="https://www.acceler8now.com/hubfs/acceler8now_2021/images/logo.svg"
            alt="A8N"
            width={32}
            height={32}
            className="h-8 w-auto"
            unoptimized
          />
          <span className="text-sm font-bold text-[#1E293B]">A8N CRM</span>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Account header card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-[#1E293B]">{fields["Name"]}</h1>
            {fields["Status"] && (
              <Badge value={fields["Status"]}>{fields["Status"]}</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
            {fields["Address"] && (
              <span>📍 {fields["Address"]}</span>
            )}
            {fields["Website"] && (
              <a
                href={fields["Website"]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0EA5E9] hover:underline"
              >
                🌐 Website
              </a>
            )}
            {fields["Main Contact Name"] && (
              <span>👤 {fields["Main Contact Name"]}</span>
            )}
            {fields["Account Owner"] && (
              <span>🏷 {fields["Account Owner"]}</span>
            )}
          </div>
          {fields["Engagement Goals"] && (
            <p className="mt-3 text-sm text-[#64748B]">{fields["Engagement Goals"]}</p>
          )}
        </div>

        <AccountDashboardClient meetings={meetings} accountId={id} />
      </div>
    </div>
  );
}
