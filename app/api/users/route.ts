import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch, airtableCreate } from "@/lib/airtable";
import { UserFields, SafeUser } from "@/types";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await airtableFetch<UserFields>("Users");

    // Strip Password Hash before returning
    const safe: SafeUser[] = records.map(({ id, fields, createdTime }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { "Password Hash": _hash, ...safeFields } = fields;
      return { id, fields: safeFields, createdTime };
    });

    return Response.json(safe);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { Name, Email, Password } = body;

    if (!Name?.trim() || !Email?.trim() || !Password) {
      return Response.json({ error: "Name, Email, and Password are required" }, { status: 400 });
    }
    if (Password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check for duplicate email
    const existing = await airtableFetch<UserFields>(
      "Users",
      `{Email}="${Email.trim()}"`
    );
    if (existing.length > 0) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(Password, 10);

    const fields: Partial<UserFields> = {
      Name: Name.trim(),
      Email: Email.trim(),
      "Password Hash": hash,
      Status: "Active",
      "Added By": session.user?.email ?? "unknown",
      "Added At": new Date().toISOString().split("T")[0],
    };

    const record = await airtableCreate<UserFields>("Users", fields);

    // Strip hash before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { "Password Hash": _hash, ...safeFields } = record.fields;
    return Response.json(
      { id: record.id, fields: safeFields, createdTime: record.createdTime },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}
