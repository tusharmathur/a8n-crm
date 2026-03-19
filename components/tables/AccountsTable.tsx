"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Account } from "@/types";

interface LinkedCounts {
  campaigns: number;
  meetings: number;
}

interface AccountsTableProps {
  accounts: Account[];
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loadingCountsId, setLoadingCountsId] = useState<string | null>(null);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, LinkedCounts>>({});
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = async (id: string) => {
    setDeleteError(null);
    setLoadingCountsId(id);
    try {
      const [campaignsRes, meetingsRes] = await Promise.all([
        fetch(`/api/campaigns?account=${id}`),
        fetch(`/api/meetings?accountId=${id}`),
      ]);
      const campaigns = campaignsRes.ok ? await campaignsRes.json() : [];
      const meetings = meetingsRes.ok ? await meetingsRes.json() : [];
      setLinkedCounts((prev) => ({
        ...prev,
        [id]: { campaigns: campaigns.length, meetings: meetings.length },
      }));
    } catch {
      setLinkedCounts((prev) => ({ ...prev, [id]: { campaigns: 0, meetings: 0 } }));
    } finally {
      setLoadingCountsId(null);
      setPendingId(id);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete account");
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
            {accounts.map((account, i) => {
              const isPending = pendingId === account.id;
              const counts = linkedCounts[account.id];
              const isLoadingCounts = loadingCountsId === account.id;

              return (
                <>
                  <tr
                    key={account.id}
                    className={`hover:bg-[#F8FAFC] ${i < accounts.length - 1 || isPending ? "border-b border-[#F1F5F9]" : ""}`}
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
                    <td className="px-4 py-3 text-[#64748B]">{account.fields["Account Owner"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{account.fields["Address"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{account.fields["Main Contact Name"] ?? "—"}</td>
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
                        {!isPending && (
                          <button
                            onClick={() => handleDeleteClick(account.id)}
                            disabled={isLoadingCounts}
                            className="text-xs border border-[#FCA5A5] rounded-md px-3 py-1 text-[#EF4444] hover:bg-[#FFF5F5] disabled:opacity-50"
                          >
                            {isLoadingCounts ? <Spinner size="sm" /> : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isPending && (
                    <tr key={`${account.id}-confirm`} className="bg-[#FFF5F5] border-b border-[#FCA5A5]">
                      <td colSpan={6} className="px-4 py-3">
                        {counts && (counts.campaigns > 0 || counts.meetings > 0) && (
                          <p className="text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded px-3 py-2 mb-2">
                            This account has {counts.campaigns > 0 ? `${counts.campaigns} campaign${counts.campaigns !== 1 ? "s" : ""}` : ""}
                            {counts.campaigns > 0 && counts.meetings > 0 ? " and " : ""}
                            {counts.meetings > 0 ? `${counts.meetings} meeting${counts.meetings !== 1 ? "s" : ""}` : ""} linked to it.
                            Deleting the account will NOT delete linked records, but they will lose their account reference.
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#1E293B]">
                            Delete &ldquo;{account.fields["Name"]}&rdquo;? This cannot be undone.
                          </span>
                          <button
                            onClick={handleCancel}
                            className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#64748B] hover:bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(account.id)}
                            disabled={deleting}
                            className="text-xs rounded-md px-3 py-1 bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-50 flex items-center gap-1"
                          >
                            {deleting ? <><Spinner size="sm" /> Deleting…</> : "Yes, Delete"}
                          </button>
                        </div>
                        {deleteError && (
                          <p className="text-[#EF4444] text-xs mt-2">{deleteError}</p>
                        )}
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
