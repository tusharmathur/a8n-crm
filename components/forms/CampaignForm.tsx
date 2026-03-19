"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { Toast, useToast } from "@/components/ui/Toast";
import { Account, Campaign } from "@/types";

interface CampaignFormProps {
  accounts: Account[];
  mode?: "create" | "edit";
  initialValues?: Campaign;
  recordId?: string;
}

export function CampaignForm({ accounts, mode = "create", initialValues, recordId }: CampaignFormProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();

  const [form, setForm] = useState({
    "Campaign Name": initialValues?.fields["Campaign Name"] ?? "",
    Account: initialValues?.fields["Account"]?.[0] ?? "",
    Purpose: initialValues?.fields["Purpose"] ?? "",
    "Requests Sent": initialValues?.fields["Requests Sent"]?.toString() ?? "",
    "Requests Accepted": initialValues?.fields["Requests Accepted"]?.toString() ?? "",
    Replies: initialValues?.fields["Replies"]?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form["Campaign Name"].trim()) e["Campaign Name"] = "Campaign Name is required";
    if (!form.Account) e.Account = "Account is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const url = mode === "edit" ? `/api/campaigns/${recordId}` : "/api/campaigns";
      const method = mode === "edit" ? "PATCH" : "POST";

      const payload = {
        "Campaign Name": form["Campaign Name"].trim(),
        Account: [form.Account],
        ...(form.Purpose && { Purpose: form.Purpose }),
        ...(form["Requests Sent"] && { "Requests Sent": Number(form["Requests Sent"]) }),
        ...(form["Requests Accepted"] && { "Requests Accepted": Number(form["Requests Accepted"]) }),
        ...(form.Replies && { Replies: Number(form.Replies) }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? (mode === "edit" ? "Failed to update campaign" : "Failed to create campaign"));
        return;
      }

      showToast(mode === "edit" ? "Changes saved" : "Campaign created");
      setTimeout(() => router.push("/campaigns"), 1000);
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
            <Label htmlFor="campaignName" required>Campaign Name</Label>
            <Input
              id="campaignName"
              value={form["Campaign Name"]}
              onChange={(e) => set("Campaign Name", e.target.value)}
            />
            {errors["Campaign Name"] && (
              <p className="text-[#EF4444] text-xs mt-1">{errors["Campaign Name"]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="account" required>Account</Label>
            <Select
              id="account"
              value={form.Account}
              onChange={(e) => set("Account", e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fields["Name"]}
                </option>
              ))}
            </Select>
            {errors.Account && (
              <p className="text-[#EF4444] text-xs mt-1">{errors.Account}</p>
            )}
          </div>

          <div>
            <Label htmlFor="requestsSent">Requests Sent</Label>
            <Input
              id="requestsSent"
              type="number"
              min="0"
              value={form["Requests Sent"]}
              onChange={(e) => set("Requests Sent", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="requestsAccepted">Requests Accepted</Label>
            <Input
              id="requestsAccepted"
              type="number"
              min="0"
              value={form["Requests Accepted"]}
              onChange={(e) => set("Requests Accepted", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="replies">Replies</Label>
            <Input
              id="replies"
              type="number"
              min="0"
              value={form.Replies}
              onChange={(e) => set("Replies", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            rows={4}
            value={form.Purpose}
            onChange={(e) => set("Purpose", e.target.value)}
          />
        </div>

        {apiError && <p className="text-[#EF4444] text-sm mt-4">{apiError}</p>}

        <div className="flex gap-3 mt-6">
          <Button type="submit" variant="primary" loading={loading}>
            {mode === "edit" ? "Save Changes" : "Create Campaign"}
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
