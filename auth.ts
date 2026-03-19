import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { airtableFetch, airtableUpdate } from "@/lib/airtable";
import { UserFields } from "@/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const records = await airtableFetch<UserFields>(
          "Users",
          `{Email}="${email}"`
        );
        if (!records.length) return null;

        const user = records[0];
        if (user.fields["Status"] !== "Active") return null;

        const hash = user.fields["Password Hash"];
        if (!hash) return null;

        const valid = await bcrypt.compare(password, hash);
        if (!valid) return null;

        await airtableUpdate<UserFields>("Users", user.id, {
          "Last Login": new Date().toISOString(),
        });

        return {
          id: user.id,
          name: user.fields["Name"],
          email: user.fields["Email"],
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
