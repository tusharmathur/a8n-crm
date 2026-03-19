import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

global.fetch = vi.fn();

import { MeetingForm } from "@/components/forms/MeetingForm";
import { Account, Campaign } from "@/types";

const mockAccounts: Account[] = [
  { id: "recA1", fields: { Name: "Acme Corp" }, createdTime: "" },
];
const mockCampaigns: Campaign[] = [
  { id: "recC1", fields: { "Campaign Name": "Q1 Push" }, createdTime: "" },
];

describe("MeetingForm", () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
    render(<MeetingForm accounts={mockAccounts} campaigns={mockCampaigns} />);
  });

  it("shows validation error when Attendee Name is empty", async () => {
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => {
      expect(screen.getByText(/attendee name is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when Account is not selected", async () => {
    await userEvent.type(screen.getByLabelText(/attendee name/i), "Jane Doe");
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => {
      expect(screen.getByText(/account is required/i)).toBeInTheDocument();
    });
  });

  it("Generate Background button is disabled when Attendee Name is empty", () => {
    const btn = screen.getByRole("button", { name: /generate background/i });
    expect(btn).toBeDisabled();
  });

  it("Generate Background button is enabled when Attendee Name is filled", async () => {
    await userEvent.type(screen.getByLabelText(/attendee name/i), "Jane");
    const btn = screen.getByRole("button", { name: /generate background/i });
    expect(btn).not.toBeDisabled();
  });

  it("Generate Background populates textarea on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ background: "Jane is a VP at Acme." }),
    } as never);
    await userEvent.type(screen.getByLabelText(/attendee name/i), "Jane Doe");
    fireEvent.click(screen.getByRole("button", { name: /generate background/i }));
    await waitFor(() => {
      const textarea = screen.getByLabelText(/attendee background/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain("Jane is a VP");
    });
  });

  it("Generate Background shows error on failure, textarea unchanged", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "fail" }) } as never);
    await userEvent.type(screen.getByLabelText(/attendee name/i), "Jane");
    fireEvent.click(screen.getByRole("button", { name: /generate background/i }));
    await waitFor(() => {
      expect(screen.getByText(/could not generate/i)).toBeInTheDocument();
    });
    const textarea = screen.getByLabelText(/attendee background/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("calls POST /api/meetings with all fields on valid submit", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "recNew" }) } as never);
    await userEvent.type(screen.getByLabelText(/attendee name/i), "Jane Doe");
    fireEvent.change(screen.getByLabelText(/^account/i), { target: { value: "recA1" } });
    fireEvent.change(screen.getByLabelText(/^campaign/i), { target: { value: "recC1" } });
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith("/api/meetings", expect.objectContaining({ method: "POST" }));
    });
  });
});
