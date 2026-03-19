import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { signIn } from "next-auth/react";
import { LoginForm } from "@/components/LoginForm";

const mockSignIn = vi.mocked(signIn);

describe("LoginForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    render(<LoginForm />);
  });

  it("shows validation error for empty email on submit", async () => {
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for empty password on submit", async () => {
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("shows error message on wrong credentials", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" } as never);
    await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("calls signIn with credentials provider", async () => {
    mockSignIn.mockResolvedValue({ error: null } as never);
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "mypassword");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
        email: "test@example.com",
        password: "mypassword",
        redirect: false,
      }));
    });
  });
});
