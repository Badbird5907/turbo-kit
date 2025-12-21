import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  socialProviders: BetterAuthOptions['socialProviders'];
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: Object.fromEntries(Object.entries(options.socialProviders ?? {}).map(([key, value]) => [key, {
      clientId: value.clientId,
      clientSecret: value.clientSecret,
      redirectURI: value.redirectURI ?? `${options.productionUrl}/api/auth/callback/${key}`,
    }])),
    emailAndPassword: {
      enabled: true,
    },
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
