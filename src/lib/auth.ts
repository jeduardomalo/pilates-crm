import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Accept username, email, or login (client / provider key may vary)
        const raw = credentials as Record<string, unknown> | undefined;
        const login = (raw?.username ?? raw?.email ?? raw?.login) as string | undefined;
        const passwordInput = (raw?.password as string | undefined) ?? "";
        const trimmed = typeof login === "string" ? login.trim() : "";
        if (!trimmed || !passwordInput) {
          return null;
        }

        const admin = await db.admin.findFirst({
          where: {
            OR: [
              { username: trimmed },
              { email: trimmed }
            ]
          }
        });

        if (!admin) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          passwordInput,
          admin.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name || admin.username || admin.email,
        };
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
});
