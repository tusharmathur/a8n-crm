"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Toast, useToast } from "@/components/ui/Toast";
import { Account } from "@/types";

interface AccountFormProps {
  mode?: "create" | "edit";
  initialValues?: Account;
  recordId?: string;
}

export function AccountForm({ mode = "create", initialValues, recordId }: AccountFormProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();

  const [form, setForm] = useState({
    Name: initialValues?.fields["Name"] ?? "",
    Status: initialValues?.fields["Status"] ?? "",
    Website: initialValues?.fields["Website"] ?? "",
    "Account Owner": initialValues?.fields["Account Owner"] ?? "",
    "Main Contact Name": initialValues?.fields["Main Contact Name"] ?? "",
    Address: initialValues?.fields["Address"] ?? "",
    "Engagement Goals": initialValues?.fields["Engagement Goals"] ?? "",
    "Slack Channel": initialValues?.fields["Slack Channel"] ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.Name.trim()) e.Name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const url = mode === "edit" ? `/api/accounts/${recordId}` : "/api/accounts";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? (mode === "edit" ? "Failed to update account" : "Failed to create account"));
        return;
      }

      showToast(mode === "edit" ? "Changes saved" : "Account created");
      setTimeout(() => router.push("/accounts"), 1000);
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
            <Label htmlFor="name" required>Name</Label>
            <Input
              id="name"
              value={form.Name}
              onChange={(e) => set("Name", e.target.value)}
            />
            {errors.Name && <p className="text-[#EF4444] text-xs mt-1">{errors.Name}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.Status}
              onChange={(e) => set("Status", e.target.value)}
            >
              <option value="">Select status</option>
              <option value="Current">Current</option>
              <option value="Past">Past</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={form.Website}
              onChange={(e) => set("Website", e.target.value)}
              placeholder="https://"
            />
          </div>

          <div>
            <Label htmlFor="owner">Account Owner</Label>
            <Input
              id="owner"
              value={form["Account Owner"]}
              onChange={(e) => set("Account Owner", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="contact">Main Contact Name</Label>
            <Input
              id="contact"
              value={form["Main Contact Name"]}
              onChange={(e) => set("Main Contact Name", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.Address}
              onChange={(e) => set("Address", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="goals">Engagement Goals</Label>
          <Textarea
            id="goals"
            rows={4}
            value={form["Engagement Goals"]}
            onChange={(e) => set("Engagement Goals", e.target.value)}
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="slackChannel">Slack Channel</Label>
          <Input
            id="slackChannel"
            value={form["Slack Channel"]}
            onChange={(e) => set("Slack Channel", e.target.value)}
            placeholder="#channel-name"
          />
          <p className="text-xs text-[#94A3B8] mt-1">
            The Slack channel where meeting notifications will be sent
          </p>
        </div>

        {apiError && (
          <p className="text-[#EF4444] text-sm mt-4">{apiError}</p>
        )}

        <div className="flex gap-3 mt-6">
          <Button type="submit" variant="primary" loading={loading}>
            {mode === "edit" ? "Save Changes" : "Create Account"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
