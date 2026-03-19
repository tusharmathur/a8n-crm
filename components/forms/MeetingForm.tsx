"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { Toast, useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { Account, Campaign, Meeting } from "@/types";

/** Convert ISO date string to datetime-local input format (YYYY-MM-DDTHH:MM) */
function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

interface MeetingFormProps {
  accounts: Account[];
  campaigns: Campaign[];
  mode?: "create" | "edit";
  initialValues?: Meeting;
  recordId?: string;
}

/** Form for creating or editing a meeting, with AI background generation. */
export function MeetingForm({ accounts, campaigns, mode = "create", initialValues, recordId }: MeetingFormProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();

  const [form, setForm] = useState({
    Account: initialValues?.fields["Account"]?.[0] ?? "",
    Campaign: initialValues?.fields["Campaign"]?.[0] ?? "",
    "Scheduled Meeting Date": toDatetimeLocal(initialValues?.fields["Scheduled Meeting Date"]),
    "Meeting Taker": initialValues?.fields["Meeting Taker"] ?? "",
    "Meeting Taker Email": initialValues?.fields["Meeting Taker Email"] ?? "",
    "Attendee Name": initialValues?.fields["Attendee Name"] ?? "",
    "Attendee Email": initialValues?.fields["Attendee Email"] ?? "",
    "Attendee Phone": initialValues?.fields["Attendee Phone"] ?? "",
    "Attendee LinkedIn": initialValues?.fields["Attendee LinkedIn"] ?? "",
    "Attendee Company": initialValues?.fields["Attendee Company"] ?? "",
    "Attendee Background": initialValues?.fields["Attendee Background"] ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form["Attendee Name"].trim()) e["Attendee Name"] = "Attendee Name is required";
    if (!form.Account) e.Account = "Account is required";
    if (!form.Campaign) e.Campaign = "Campaign is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectedAccount = accounts.find((a) => a.id === form.Account);
  const selectedCampaign = campaigns.find((c) => c.id === form.Campaign);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: form["Attendee Name"],
          attendeeEmail: form["Attendee Email"],
          attendeeLinkedIn: form["Attendee LinkedIn"],
          attendeeCompany: form["Attendee Company"],
          accountName: selectedAccount?.fields["Name"],
          campaignName: selectedCampaign?.fields["Campaign Name"],
          campaignPurpose: selectedCampaign?.fields["Purpose"],
        }),
      });
      if (!res.ok) {
        setGenerateError("Could not generate — fill in more fields and try again");
        return;
      }
      const data = await res.json();
      set("Attendee Background", data.background ?? "");
    } catch {
      setGenerateError("Could not generate — fill in more fields and try again");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const url = mode === "edit" ? `/api/meetings/${recordId}` : "/api/meetings";
      const method = mode === "edit" ? "PATCH" : "POST";

      const payload = {
        "Attendee Name": form["Attendee Name"].trim(),
        Account: [form.Account],
        Campaign: [form.Campaign],
        ...(form["Scheduled Meeting Date"] && { "Scheduled Meeting Date": form["Scheduled Meeting Date"] }),
        ...(form["Meeting Taker"] && { "Meeting Taker": form["Meeting Taker"] }),
        ...(form["Meeting Taker Email"] && { "Meeting Taker Email": form["Meeting Taker Email"] }),
        ...(form["Attendee Email"] && { "Attendee Email": form["Attendee Email"] }),
        ...(form["Attendee Phone"] && { "Attendee Phone": form["Attendee Phone"] }),
        ...(form["Attendee LinkedIn"] && { "Attendee LinkedIn": form["Attendee LinkedIn"] }),
        ...(form["Attendee Company"] && { "Attendee Company": form["Attendee Company"] }),
        ...(form["Attendee Background"] && { "Attendee Background": form["Attendee Background"] }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? (mode === "edit" ? "Failed to update meeting" : "Failed to create meeting"));
        return;
      }

      showToast(mode === "edit" ? "Changes saved" : "Meeting created");
      setTimeout(() => router.push("/meetings"), 1000);
    } catch {
      setApiError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="account" required>Account</Label>
            <Select
              id="account"
              value={form.Account}
              onChange={(e) => set("Account", e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.fields["Name"]}</option>
              ))}
            </Select>
            {errors.Account && <p className="text-[#EF4444] text-xs mt-1">{errors.Account}</p>}
          </div>

          <div>
            <Label htmlFor="campaign" required>Campaign</Label>
            <Select
              id="campaign"
              value={form.Campaign}
              onChange={(e) => set("Campaign", e.target.value)}
            >
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.fields["Campaign Name"]}</option>
              ))}
            </Select>
            {errors.Campaign && <p className="text-[#EF4444] text-xs mt-1">{errors.Campaign}</p>}
          </div>

          <div>
            <Label htmlFor="scheduledDate">Scheduled Meeting Date</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={form["Scheduled Meeting Date"]}
              onChange={(e) => set("Scheduled Meeting Date", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="meetingTaker">Meeting Taker</Label>
            <Input
              id="meetingTaker"
              value={form["Meeting Taker"]}
              onChange={(e) => set("Meeting Taker", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="meetingTakerEmail">Meeting Taker Email</Label>
            <Input
              id="meetingTakerEmail"
              type="email"
              value={form["Meeting Taker Email"]}
              onChange={(e) => set("Meeting Taker Email", e.target.value)}
            />
          </div>
        </div>

        {/* Attendee section */}
        <div className="mt-6 mb-3 pb-1 border-b border-[#E2E8F0]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Attendee</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="attendeeName" required>Attendee Name</Label>
            <Input
              id="attendeeName"
              value={form["Attendee Name"]}
              onChange={(e) => set("Attendee Name", e.target.value)}
            />
            {errors["Attendee Name"] && (
              <p className="text-[#EF4444] text-xs mt-1">{errors["Attendee Name"]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="attendeeEmail">Attendee Email</Label>
            <Input
              id="attendeeEmail"
              type="email"
              value={form["Attendee Email"]}
              onChange={(e) => set("Attendee Email", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="attendeePhone">Attendee Phone</Label>
            <Input
              id="attendeePhone"
              value={form["Attendee Phone"]}
              onChange={(e) => set("Attendee Phone", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="attendeeLinkedIn">Attendee LinkedIn</Label>
            <Input
              id="attendeeLinkedIn"
              type="url"
              value={form["Attendee LinkedIn"]}
              onChange={(e) => set("Attendee LinkedIn", e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <Label htmlFor="attendeeCompany">Attendee Company</Label>
            <Input
              id="attendeeCompany"
              value={form["Attendee Company"]}
              onChange={(e) => set("Attendee Company", e.target.value)}
            />
          </div>
        </div>

        {/* AI generation section */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!form["Attendee Name"].trim() || generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#BAE6FD] rounded-md text-sm text-[#0369A1] bg-[#F0F9FF] hover:bg-[#E0F2FE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Spinner size="sm" />
                Generating…
              </>
            ) : (
              <>✨ {mode === "edit" ? "Regenerate Background" : "Generate Background"}</>
            )}
          </button>
          {generateError && (
            <p className="text-[#EF4444] text-xs mt-1">{generateError}</p>
          )}
        </div>

        <div className="mt-3">
          <Label htmlFor="background">Attendee Background</Label>
          <Textarea
            id="background"
            rows={5}
            value={form["Attendee Background"]}
            onChange={(e) => set("Attendee Background", e.target.value)}
            placeholder="Click 'Generate Background' above, or type manually"
          />
        </div>

        {apiError && <p className="text-[#EF4444] text-sm mt-4">{apiError}</p>}

        <div className="flex gap-3 mt-6">
          <Button type="submit" variant="primary" loading={loading}>
            {mode === "edit" ? "Save Changes" : "Create Meeting"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
