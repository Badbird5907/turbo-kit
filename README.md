# turbo-kit

## Installation
To initialize a new project with turbo-kit, simply run the following command:
```bash
pnpm create turbo-kit@latest
```

## About

turbo-kit is [Evan Yu](https://evanyu.dev)'s opinionated starter monorepo template for Turborepo + Next.js with tRPC, Drizzle, Shadcn/ui, Better Auth, and more.

It is based heavily on [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) with
some modifications to help you get started quickly. (notably, removing Tanstack Start and Expo)

It uses [Turborepo](https://turborepo.com) and contains:

```text
.github
  └─ workflows
        └─ CI with pnpm cache setup
.vscode
  └─ Recommended extensions and settings for VSCode users
apps
  ├─ nextjs
  │   ├─ Next.js 15
  │   ├─ React 19
  │   ├─ Tailwind CSS v4
  │   └─ E2E Typesafe API Server & Client
packages
  ├─ api
  │   └─ tRPC v11 router definition
  ├─ auth
  │   └─ Authentication using better-auth.
  ├─ db
  │   └─ Typesafe db calls using Drizzle & Supabase
  ├─ email
  │   └─ React Email templates
  ├─ redis
  │   └─ Upstash Redis client
  ├─ types
  │   └─ The types used in the application
  └─ ui
      └─ Start of a UI package for the webapp using shadcn-ui
tooling
  ├─ eslint
  │   └─ shared, fine-grained, eslint presets
  ├─ prettier
  │   └─ shared prettier configuration
  ├─ tailwind
  │   └─ shared tailwind theme and configuration
  └─ typescript
      └─ shared tsconfig you can extend from
```

## Quick Start

To get it running, follow the steps below:

### 1. Install dependencies and begin developing

```bash
# Install dependencies
pnpm i

# Configure environment variables
# There is an `.env.example` in the root directory you can use for reference
vim .env
```

#### Configure a Github OAuth app
Navigate to [Settings > Developer Settings > Oauth Apps > New](https://github.com/settings/applications/new), and fill out the details.

For the Authorization callback URL, fill in `http://localhost:3000/api/auth/callback/github`.
If you are deploying the auth proxy, change the domain to your production domain

```bash
# Push the Drizzle schema to the database
pnpm db:push

# Spin up docker container
# First run will take a while to download the images, and set things up
# Subsequent runs will be faster
docker compose up -d

# Run next dev server
# This command actually also runs the above docker command
pnpm run dev
```

### 2. Database / Drizzle ORM

This project uses [Drizzle ORM](https://orm.drizzle.team) for type-safe database queries. The database schema is defined in `packages/db/src/schema/index.ts`.

#### Defining Tables

Here's an example of how to define a table using Drizzle:

```typescript
import { pgTable } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdate(() => new Date()),
}));
```

#### Querying the Database

The database client is exported from `@acme/db/client`. Here are some example queries:

```typescript
import { db } from "@acme/db/client";
import { posts } from "@acme/db/schema";
import { eq, desc } from "@acme/db";

// Find all posts
const allPosts = await db.query.posts.findMany({
  orderBy: desc(posts.createdAt),
  limit: 10,
});

// Find a post by ID
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
});

// Insert a new post
await db.insert(posts).values({
  title: "My Post",
  content: "Post content here",
});

// Update a post
await db.update(posts)
  .set({ title: "Updated Title" })
  .where(eq(posts.id, postId));

// Delete a post
await db.delete(posts).where(eq(posts.id, postId));
```

#### Type-Safe Schemas

For input validation and type inference, check out [`packages/types/src/index.ts`](./packages/types/src/index.ts). This package uses `drizzle-zod` to generate Zod schemas from your Drizzle tables, which can be used for both runtime validation and type inference.

For more in-depth information about Drizzle ORM, see the [official Drizzle documentation](https://orm.drizzle.team/docs/overview).

### 3. tRPC Routers

This project uses [tRPC](https://trpc.io) for end-to-end type-safe APIs. Routers are defined in `packages/api/src/router/` and combined in `packages/api/src/root.ts`.

#### Procedures

tRPC uses procedures to define your API endpoints. This template provides two types of procedures:

- **`publicProcedure`**: A base procedure that doesn't require authentication. Anyone can call these endpoints, but you can still access session data if the user is logged in (via `ctx.session`).

- **`protectedProcedure`**: A procedure that requires authentication. It verifies the session is valid and guarantees `ctx.session.user` is not null. If a user is not authenticated, it throws an `UNAUTHORIZED` error.

#### Creating a Router

Here's an example of a simple tRPC router:

```typescript
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";
import { desc, eq } from "@acme/db";
import { posts } from "@acme/db/schema";
import { CreatePostSchema } from "@acme/types";
import { protectedProcedure, publicProcedure } from "../trpc";

export const postRouter = {
  // Public query - fetch all posts
  all: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.posts.findMany({
      orderBy: desc(posts.createdAt),
      limit: 10,
    });
  }),

  // Public query with input - fetch post by ID
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.id),
      });
    }),

  // Protected mutation - create a post (requires authentication)
  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insert(posts).values(input);
    }),

  // Protected mutation - delete a post
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.delete(posts).where(eq(posts.id, input));
    }),
} satisfies TRPCRouterRecord;
```

#### Adding Routers to the App Router

Routers are combined in `packages/api/src/root.ts`:

```typescript
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  // Add more routers here
});
```

For more examples, see the existing routers in [`packages/api/src/router/`](./packages/api/src/router/). For comprehensive tRPC documentation, visit [https://trpc.io/docs/](https://trpc.io/docs/).

### 4. Better Auth Schema

This project uses [Better Auth](https://www.better-auth.com) for authentication. The template comes with a pre-generated auth schema, so you can start using authentication features right away.

However, if you make any changes to the auth configuration (e.g., adding new providers, plugins, or modifying the auth setup), you'll need to regenerate the auth schema:

```bash
# Generate the Better Auth schema
pnpm --filter @acme/auth generate
```

This command runs the Better Auth CLI with the following configuration:

- **Config file**: `packages/auth/script/auth-cli.ts` - A CLI-only configuration file (isolated from src to prevent imports)
- **Output**: `packages/db/src/schema/auth.ts` - Generated Drizzle schema for authentication tables

The generation process:

1. Reads the Better Auth configuration from `packages/auth/script/auth-cli.ts`
2. Generates the appropriate database schema based on your auth setup
3. Outputs a Drizzle-compatible schema file to the `@acme/db` package

> **Note**: The `auth-cli.ts` file is placed in the `script/` directory (instead of `src/`) to prevent accidental imports from other parts of the codebase. This file is exclusively for CLI schema generation and should **not** be used directly in your application. For runtime authentication, use the configuration from `packages/auth/src/index.ts`.

For more information about the Better Auth CLI, see the [official documentation](https://www.better-auth.com/docs/concepts/cli#generate).

### 5. Deploy the Auth Proxy (RECOMMENDED)

Better-auth comes with an [auth proxy plugin](https://www.better-auth.com/docs/plugins/oauth-proxy). By deploying the Next.js app, you can get OAuth working in preview deployments and development.

By using the proxy plugin, the Next.js apps will forward any auth requests to the proxy server, which will handle the OAuth flow and then redirect back to the Next.js app. This makes it easy to get OAuth working since you'll have a stable URL that is publicly accessible and doesn't change for every deployment and doesn't rely on what port the app is running on. So if port 3000 is taken and your Next.js app starts at port 3001 instead, your auth should still work without having to reconfigure the OAuth provider.

### 6. When it's time to add a new UI component

Run the `ui-add` script to add a new UI component using the interactive `shadcn/ui` CLI:

```bash
pnpm ui-add
```

When the component(s) has been installed, you should be good to go and start using it in your app.

### 7. When it's time to add a new package

To add a new package, simply run `pnpm turbo gen init` in the monorepo root. This will prompt you for a package name as well as if you want to install any dependencies to the new package (of course you can also do this yourself later).

The generator sets up the `package.json`, `tsconfig.json` and a `index.ts`, as well as configures all the necessary configurations for tooling around your package such as formatting, linting and typechecking. When the package is created, you're ready to go build out the package.

## FAQ

### Does this pattern leak backend code to my client applications?

No, it does not. The `api` package should only be a production dependency in the Next.js application where it's served. This lets you have full typesafety in your client applications, while keeping your backend code safe.

If you need to share runtime code between the client and server, such as input validation schemas, you can create a separate `shared` package for this and import it on both sides.

### Why not run the next dev server in docker too?
See [Next.js docs - Local Development](https://nextjs.org/docs/app/guides/local-development#8-consider-local-development-over-docker)

Docker is used in this project to run only the development databases and services.

## Deployment

### Next.js

#### Deploy to Vercel

Let's deploy the Next.js application to [Vercel](https://vercel.com). If you've never deployed a Turborepo app there, don't worry, the steps are quite straightforward. You can also read the [official Turborepo guide](https://vercel.com/docs/concepts/monorepos/turborepo) on deploying to Vercel.

1. Create a new project on Vercel, select the `apps/nextjs` folder as the root directory. Vercel's zero-config system should handle all configurations for you.

2. Add your `POSTGRES_URL` environment variable.

3. Done! Your app should now be successfully deployed.

### Redis

#### Upstash
This template is pre-configured to use [Upstash](https://upstash.com/), a fast and cheap redis provider.
You can either create a free-tier account, or self-host redis + [SRH](https://github.com/hiett/serverless-redis-http)

### Auth Proxy

The auth proxy comes as a better-auth plugin. This is required for the Next.js app to be able to authenticate users in preview deployments. The auth proxy is not used for OAuth request in production deployments. The easiest way to get it running is to deploy the Next.js app to vercel.

## References

The stack originates from [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) and [create-t3-app](https://github.com/t3-oss/create-t3-app).
