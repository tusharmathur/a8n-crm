import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

global.fetch = vi.fn();

import { AccountForm } from "@/components/forms/AccountForm";

const mockFetch = vi.mocked(global.fetch);

describe("AccountForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    render(<AccountForm />);
  });

  it("shows validation error when Name is empty on submit", async () => {
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("calls POST /api/accounts with valid data", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "rec1", fields: {} }) } as never);
    await userEvent.type(screen.getByLabelText(/^name/i), "Acme Corp");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/accounts", expect.objectContaining({ method: "POST" }));
    });
  });

  it("shows loading state during submit", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    await userEvent.type(screen.getByLabelText(/^name/i), "Acme Corp");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  it("shows API error message on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Airtable error" }) } as never);
    await userEvent.type(screen.getByLabelText(/^name/i), "Acme Corp");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/airtable error/i)).toBeInTheDocument();
    });
  });
});
