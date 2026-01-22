// src/lib/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  // ✅ IMPORTANT behind proxies (or set AUTH_TRUST_HOST=true)
  trustHost: true,

  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER!,
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      authorization: {
        params: {
          // forces Keycloak login screen instead of silent SSO
          prompt: "login",
          scope: "openid profile email",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.uid = user.id;

      // ✅ capture Keycloak tokens on initial sign-in
      if (account?.provider === "keycloak") {
        (token as any).idToken = account.id_token;
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token;
        (token as any).expiresAt = account.expires_at;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && (token as any).uid) {
        (session.user as any).id = (token as any).uid as string;
      }

      // ✅ expose idToken for logout
      (session as any).idToken = (token as any).idToken ?? null;

      return session;
    },
  },
});
