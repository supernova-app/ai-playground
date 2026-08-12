import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db, schema } from "./db";
import {
  EMAIL_DOMAIN_RESTRICTION_MESSAGE,
  isEmailAllowed,
} from "./email-allowlist.server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailAllowed(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: EMAIL_DOMAIN_RESTRICTION_MESSAGE,
            });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [user] = await db
            .select({ email: schema.user.email })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          if (user && !isEmailAllowed(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: EMAIL_DOMAIN_RESTRICTION_MESSAGE,
            });
          }
        },
      },
    },
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});
