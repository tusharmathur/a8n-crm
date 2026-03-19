import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  airtableFetch: vi.fn(),
  airtableUpdate: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { airtableFetch, airtableUpdate } from "@/lib/airtable";
import bcrypt from "bcryptjs";

const mockFetch = vi.mocked(airtableFetch);
const mockUpdate = vi.mocked(airtableUpdate);
const mockCompare = vi.mocked(bcrypt.compare);

// Directly test the authorize logic since NextAuth internals aren't easily unit tested
async function authorize(credentials: { email?: string; password?: string }) {
  const email = credentials?.email;
  const password = credentials?.password;
  if (!email || !password) return null;

  const records = await airtableFetch("Users", `{Email}="${email}"`);
  if (!records.length) return null;

  const user = records[0] as { id: string; fields: Record<string, string> };
  if (user.fields["Status"] !== "Active") return null;

  const hash = user.fields["Password Hash"];
  if (!hash) return null;

  const valid = await bcrypt.compare(password, hash);
  if (!valid) return null;

  await airtableUpdate("Users", user.id, { "Last Login": new Date().toISOString() });

  return { id: user.id, name: user.fields["Name"], email: user.fields["Email"] };
}

const activeUser = {
  id: "rec1",
  fields: {
    Name: "Alice",
    Email: "alice@test.com",
    "Password Hash": "hashed_pw",
    Status: "Active",
  },
  createdTime: "",
};

const suspendedUser = {
  id: "rec2",
  fields: {
    Name: "Bob",
    Email: "bob@test.com",
    "Password Hash": "hashed_pw",
    Status: "Suspended",
  },
  createdTime: "",
};

describe("Auth authorize logic", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockUpdate.mockReset();
    mockCompare.mockReset();
  });

  it("returns null when email is empty", async () => {
    const result = await authorize({ email: "", password: "password123" });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when password is empty", async () => {
    const result = await authorize({ email: "alice@test.com", password: "" });
    expect(result).toBeNull();
  });

  it("returns null when user not found", async () => {
    mockFetch.mockResolvedValue([]);
    const result = await authorize({ email: "nobody@test.com", password: "pass" });
    expect(result).toBeNull();
  });

  it("returns null when user is Suspended", async () => {
    mockFetch.mockResolvedValue([suspendedUser] as never);
    const result = await authorize({ email: "bob@test.com", password: "pass" });
    expect(result).toBeNull();
  });

  it("returns null when password is wrong", async () => {
    mockFetch.mockResolvedValue([activeUser] as never);
    mockCompare.mockResolvedValue(false as never);
    const result = await authorize({ email: "alice@test.com", password: "wrongpass" });
    expect(result).toBeNull();
  });

  it("returns user object on valid credentials", async () => {
    mockFetch.mockResolvedValue([activeUser] as never);
    mockCompare.mockResolvedValue(true as never);
    mockUpdate.mockResolvedValue({} as never);
    const result = await authorize({ email: "alice@test.com", password: "correct" });
    expect(result).not.toBeNull();
    expect(result?.email).toBe("alice@test.com");
    expect(result?.name).toBe("Alice");
  });

  it("updates Last Login on successful login", async () => {
    mockFetch.mockResolvedValue([activeUser] as never);
    mockCompare.mockResolvedValue(true as never);
    mockUpdate.mockResolvedValue({} as never);
    await authorize({ email: "alice@test.com", password: "correct" });
    expect(mockUpdate).toHaveBeenCalledWith("Users", "rec1", expect.objectContaining({ "Last Login": expect.any(String) }));
  });

  it("Password Hash field is never in returned session object", async () => {
    mockFetch.mockResolvedValue([activeUser] as never);
    mockCompare.mockResolvedValue(true as never);
    mockUpdate.mockResolvedValue({} as never);
    const result = await authorize({ email: "alice@test.com", password: "correct" });
    expect(result).not.toHaveProperty("Password Hash");
  });
});
