// src/lib/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Recommended for App Router unless you explicitly want DB sessions
  session: { strategy: "jwt" },

  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER!,
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email", // add offline_access if needed
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // user exists on initial sign-in
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        // attach your internal DB user id
        (session.user as any).id = token.uid as string;
      }
      return session;
    },
  },
});