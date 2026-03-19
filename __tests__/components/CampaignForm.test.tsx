import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

global.fetch = vi.fn();

import { CampaignForm } from "@/components/forms/CampaignForm";
import { Account } from "@/types";

const mockAccounts: Account[] = [
  { id: "rec1", fields: { Name: "Acme Corp" }, createdTime: "" },
  { id: "rec2", fields: { Name: "Globex" }, createdTime: "" },
];

describe("CampaignForm", () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
    render(<CampaignForm accounts={mockAccounts} />);
  });

  it("shows validation error when Campaign Name is empty", async () => {
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));
    await waitFor(() => {
      expect(screen.getByText(/campaign name is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when Account is not selected", async () => {
    await userEvent.type(screen.getByLabelText(/campaign name/i), "Q1 Push");
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));
    await waitFor(() => {
      expect(screen.getByText(/account is required/i)).toBeInTheDocument();
    });
  });

  it("calls POST /api/campaigns with valid data", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "recNew" }) } as never);
    await userEvent.type(screen.getByLabelText(/campaign name/i), "Q1 Push");
    fireEvent.change(screen.getByLabelText(/account/i), { target: { value: "rec1" } });
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));
    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith("/api/campaigns", expect.objectContaining({ method: "POST" }));
    });
  });
});
