import { auth } from "@/auth";
import { airtableFetch, airtableFetchOne } from "@/lib/airtable";
import { MeetingFields, AccountFields, CampaignFields, Meeting } from "@/types";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { getMeetingTitle, formatDate } from "@/lib/utils";

export default async function MeetingsPage() {
  const session = await auth();

  const records = await airtableFetch<MeetingFields>("Meetings");
  const meetings: Meeting[] = await Promise.all(
    records.map(async (r) => {
      const accountIds = r.fields["Account"] ?? [];
      const campaignIds = r.fields["Campaign"] ?? [];
      let accountName: string | undefined;
      let campaignName: string | undefined;
      if (accountIds[0]) {
        const acc = await airtableFetchOne<AccountFields>("Accounts", accountIds[0]);
        accountName = acc?.fields["Name"];
      }
      if (campaignIds[0]) {
        const camp = await airtableFetchOne<CampaignFields>("Campaigns", campaignIds[0]);
        campaignName = camp?.fields["Campaign Name"];
      }
      return { ...r, accountName, campaignName };
    })
  );

  // Sort newest first
  const sorted = meetings.sort((a, b) => {
    const dA = a.fields["Scheduled Meeting Date"] ?? "";
    const dB = b.fields["Scheduled Meeting Date"] ?? "";
    return dB.localeCompare(dA);
  });

  return (
    <div>
      <TopBar title="Meetings" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Meetings</h2>
            <p className="text-sm text-[#64748B]">{meetings.length} meetings</p>
          </div>
          <Link href="/meetings/new">
            <Button variant="primary">+ New Meeting</Button>
          </Link>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-16 text-center text-[#94A3B8]">
            No meetings yet. Add your first meeting.
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Meeting</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Account</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Meeting Taker</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const title = getMeetingTitle({
                    accountName: m.accountName,
                    meetingTaker: m.fields["Meeting Taker"],
                    attendeeName: m.fields["Attendee Name"],
                    attendeeCompany: m.fields["Attendee Company"],
                  });
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[#F8FAFC] ${i < sorted.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#1E293B] max-w-[300px]">
                        <span className="line-clamp-2">{title}</span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {m.accountName ? (
                          <Link
                            href={`/accounts/${m.fields["Account"]?.[0]}`}
                            className="hover:text-[#F97316]"
                          >
                            {m.accountName}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{m.campaignName ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B]">{m.fields["Meeting Taker"] ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {formatDate(m.fields["Scheduled Meeting Date"])}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
