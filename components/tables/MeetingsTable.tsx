"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Meeting } from "@/types";
import { formatDate } from "@/lib/utils";

const th = "text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium";
const td = "px-4 py-3 text-[13px]";
const dash = <span className="text-[#CBD5E1]">—</span>;

interface MeetingsTableProps {
  meetings: Meeting[];
}

export function MeetingsTable({ meetings }: MeetingsTableProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete meeting");
        return;
      }
      setPendingId(null);
      showToast("Deleted");
      setTimeout(() => router.refresh(), 500);
    } catch {
      setDeleteError("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setPendingId(null);
    setDeleteError(null);
  };

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col className="hidden sm:table-column" style={{ width: "15%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col className="hidden sm:table-column" style={{ width: "8%" }} />
            <col />
          </colgroup>
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className={th}>Attendee</th>
              <th className={th}>Company</th>
              <th className={th}>Account</th>
              <th className={`${th} hidden sm:table-cell`}>Campaign</th>
              <th className={th}>Meeting Taker</th>
              <th className={th}>Scheduled</th>
              <th className={`${th} hidden sm:table-cell`}>Created</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m, i) => {
              const isPending = pendingId === m.id;
              return (
                <>
                  <tr
                    key={m.id}
                    className={`hover:bg-[#F8FAFC] ${i < meetings.length - 1 || isPending ? "border-b border-[#F1F5F9]" : ""}`}
                  >
                    <td className={td}>
                      <Link href={`/meetings/${m.id}`} className="text-[#6B21A8] font-semibold hover:underline truncate block">
                        {m.fields["Attendee Name"]}
                      </Link>
                    </td>
                    <td className={`${td} text-[#1E1B4B] truncate`}>
                      {m.fields["Attendee Company"] ?? dash}
                    </td>
                    <td className={`${td} text-[#1E1B4B] truncate`}>
                      {m.accountName ? (
                        <Link href={`/accounts/${m.fields["Account"]?.[0]}`} className="hover:underline hover:text-[#6B21A8]">
                          {m.accountName}
                        </Link>
                      ) : dash}
                    </td>
                    <td className={`${td} text-[#64748B] truncate hidden sm:table-cell`}>
                      {m.campaignName ?? dash}
                    </td>
                    <td className={`${td} text-[#1E1B4B] truncate`}>
                      {m.fields["Meeting Taker"] ?? dash}
                    </td>
                    <td className={`${td} text-[#1E1B4B]`}>
                      {formatDate(m.fields["Scheduled Meeting Date"])}
                    </td>
                    <td className={`${td} text-[#64748B] hidden sm:table-cell`}>
                      {formatDate(m.fields["Meeting Creation Date"])}
                    </td>
                    <td className={td}>
                      <div className="flex gap-2">
                        <Link href={`/meetings/${m.id}/edit`}>
                          <button className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#1E1B4B] hover:bg-[#F8FAFC]">
                            Edit
                          </button>
                        </Link>
                        {!isPending && (
                          <button
                            onClick={() => { setDeleteError(null); setPendingId(m.id); }}
                            className="text-xs border border-[#FCA5A5] rounded-md px-3 py-1 text-[#EF4444] hover:bg-[#FFF5F5]"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isPending && (
                    <tr key={`${m.id}-confirm`} className="bg-[#FFF5F5] border-b border-[#FCA5A5]">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#1E1B4B]">
                            Delete &ldquo;{m.fields["Attendee Name"]}&rdquo;? This cannot be undone.
                          </span>
                          <button onClick={handleCancel} className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#64748B] hover:bg-white">
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(m.id)}
                            disabled={deleting}
                            className="text-xs rounded-md px-3 py-1 bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-50 flex items-center gap-1"
                          >
                            {deleting ? <><Spinner size="sm" /> Deleting…</> : "Yes, Delete"}
                          </button>
                        </div>
                        {deleteError && <p className="text-[#EF4444] text-xs mt-2">{deleteError}</p>}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} variant="error" onDismiss={dismissToast} />}
    </>
  );
}
