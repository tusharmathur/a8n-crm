"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Toast, useToast } from "@/components/ui/Toast";
import { SafeUser } from "@/types";
import { getInitials, formatDate } from "@/lib/utils";

interface UsersManagerProps {
  initialUsers: SafeUser[];
  currentUserEmail: string;
}

/** Admin users management table with add/suspend/remove. */
export function UsersManager({ initialUsers, currentUserEmail }: UsersManagerProps) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ Name: "", Email: "", Password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addApiError, setAddApiError] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  const setField = (key: string, value: string) =>
    setAddForm((prev) => ({ ...prev, [key]: value }));

  const validateAdd = () => {
    const e: Record<string, string> = {};
    if (!addForm.Name.trim()) e.Name = "Name is required";
    if (!addForm.Email.trim()) e.Email = "Email is required";
    if (!addForm.Password) e.Password = "Password is required";
    else if (addForm.Password.length < 8) e.Password = "Minimum 8 characters";
    setAddErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAdd()) return;
    setAdding(true);
    setAddApiError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddApiError(data.error ?? "Failed to add user");
        return;
      }
      setUsers((prev) => [...prev, data]);
      setAddForm({ Name: "", Email: "", Password: "" });
      setShowAddForm(false);
      showToast("User added");
    } catch {
      setAddApiError("An unexpected error occurred");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Status: newStatus }),
      });
      if (!res.ok) return;
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, fields: { ...u.fields, Status: newStatus as "Active" | "Suspended" } } : u))
      );
      showToast(`User ${newStatus === "Suspended" ? "suspended" : "reactivated"}`);
    } catch {
      // silent
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmRemove(null);
      showToast("User removed");
    } catch {
      // silent
    }
  };

  return (
    <>
      {/* Add user form toggle */}
      <div className="mb-6">
        {!showAddForm ? (
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            + Add User
          </Button>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-sm max-w-[600px]">
            <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">Add New User</h3>
            <form onSubmit={handleAdd} noValidate>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="addName" required>Name</Label>
                  <Input id="addName" value={addForm.Name} onChange={(e) => setField("Name", e.target.value)} />
                  {addErrors.Name && <p className="text-[#EF4444] text-xs mt-1">{addErrors.Name}</p>}
                </div>
                <div>
                  <Label htmlFor="addEmail" required>Email</Label>
                  <Input id="addEmail" type="email" value={addForm.Email} onChange={(e) => setField("Email", e.target.value)} />
                  {addErrors.Email && <p className="text-[#EF4444] text-xs mt-1">{addErrors.Email}</p>}
                </div>
                <div>
                  <Label htmlFor="addPassword" required>Password</Label>
                  <div className="relative">
                    <Input
                      id="addPassword"
                      type={showPassword ? "text" : "password"}
                      value={addForm.Password}
                      onChange={(e) => setField("Password", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {addErrors.Password && <p className="text-[#EF4444] text-xs mt-1">{addErrors.Password}</p>}
                </div>
              </div>
              {addApiError && <p className="text-[#EF4444] text-sm mt-3">{addApiError}</p>}
              <div className="flex gap-3 mt-4">
                <Button type="submit" variant="primary" loading={adding} loadingText="Adding…">
                  Add User
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowAddForm(false); setAddApiError(""); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium w-10"></th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Name</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Added By</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const isOwnAccount = user.fields.Email === currentUserEmail;
              const status = user.fields.Status;
              return (
                <tr
                  key={user.id}
                  className={`${i < users.length - 1 ? "border-b border-[#F1F5F9]" : ""} hover:bg-[#F8FAFC]`}
                >
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6B21A8] font-bold text-xs">
                      {getInitials(user.fields.Name)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1E1B4B]">{user.fields.Name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{user.fields.Email}</td>
                  <td className="px-4 py-3">
                    <Badge value={status}>{status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{user.fields["Added By"] ?? "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {user.fields["Last Login"] ? formatDate(user.fields["Last Login"]) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {isOwnAccount ? (
                      <span
                        title="Cannot modify your own account"
                        className="text-xs text-[#94A3B8] cursor-not-allowed"
                      >
                        —
                      </span>
                    ) : confirmRemove === user.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#1E1B4B]">Remove {user.fields.Name}?</span>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-[#64748B] hover:text-[#1E1B4B]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemove(user.id)}
                          className="text-[#EF4444] hover:text-[#DC2626] font-medium"
                        >
                          Confirm Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(user.id, status)}
                          className="text-xs border border-[#E2E8F0] rounded-md px-2 py-1 text-[#1E1B4B] hover:bg-[#F8FAFC]"
                        >
                          {status === "Active" ? "Suspend" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(user.id)}
                          className="text-xs border border-[#FCA5A5] rounded-md px-2 py-1 text-[#EF4444] hover:bg-[#FEE2E2]"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#94A3B8] italic mt-4">
        Passwords are hashed with bcrypt and never stored in plaintext.
        Users cannot self-register — accounts must be created here by an admin.
      </p>

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
