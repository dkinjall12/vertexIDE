import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

import authConfig from "./auth.config"
import { db } from "./lib/db";
import { getAccountByUserId, getUserById } from "@/features/auth/actions";

 

 
export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    /**
     * Handle user creation and account linking after a successful sign-in
     */
    async signIn({ user, account, profile }) {
      if (!user || !account) return false;

      // Check if the user already exists
      const existingUser = await db.user.findUnique({
        where: { email: user.email! },
      });

      // If user does not exist, create a new one
      if (!existingUser) {
        const newUser = await db.user.create({
          data: {
            email: user.email!,
            name: user.name,
            image: user.image,
            accounts: {
              create: {
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refreshToken: account.refresh_token ?? undefined,
                accessToken: account.access_token ?? undefined,
                expiresAt: account.expires_at ?? undefined,
                tokenType: account.token_type ?? undefined,
                scope: account.scope ?? undefined,
                idToken: account.id_token ?? undefined,
                sessionState: account.session_state as string | undefined,
              },
            },
          },
        });

        if (!newUser) return false; // Return false if user creation fails
      } else {
        // Link the account if user exists
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        // If the account does not exist, create it
        if (!existingAccount) {
          await db.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refreshToken: account.refresh_token ?? undefined,
              accessToken: account.access_token ?? undefined,
              expiresAt: account.expires_at ?? undefined,
              tokenType: account.token_type ?? undefined,
              scope: account.scope ?? undefined,
              idToken: account.id_token ?? undefined,
              sessionState: account.session_state as string | undefined,
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if(!token.sub) return token;
      const existingUser = await getUserById(token.sub)

      if(!existingUser) return token;

      const exisitingAccount = await getAccountByUserId(existingUser.id);

      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;

      return token;
    },

    async session({ session, token }) {
      // Attach the user ID from the token to the session
    if(token.sub  && session.user){
      session.user.id = token.sub
    } 

    if(token.sub && session.user){
      session.user.role = token.role
    }

    return session;
    },
  },
  
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
})