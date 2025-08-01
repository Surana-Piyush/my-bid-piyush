// src/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { participants } from "../../backend/lib/db/schema";
import { eq } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = await db
        .select()
        .from(participants)
        .where(eq(participants.email, user.email));

      if (existing.length === 0) {
        await db.insert(participants).values({
          name: user.name ?? '',
          email: user.email,
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          name: token.name,
          email: token.email,
        };
      }
      return session;
    },
  },
};