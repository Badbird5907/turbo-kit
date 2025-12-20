import { Suspense } from "react";
import { ExternalLink } from "lucide-react";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { CreatePostForm, PostCardSkeleton, PostList } from "@/components/posts";
import Link from "next/link";
import { Button } from "@acme/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/components/card";


export default function HomePage() {
  prefetch(trpc.post.all.queryOptions());

  return (
    <HydrateClient>
      <main className="relative min-h-screen">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center text-center">            
            <h1 className="mb-4 bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl md:text-7xl lg:text-8xl">
              Welcome to Turbo Kit
            </h1>
            
            <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              An opinionated full-stack template for quickly building Next.js and turborepo apps with
              tRPC, Drizzle, Shadcn/ui, Better Auth, and more.
            </p>

            <Card className="mb-12 w-full max-w-3xl bg-card/30 text-left backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="text-base">
                  This template is ready to use! Here are some files you can start with:
                </p>
                <ul className="list-disc space-y-2 pl-6 marker:text-primary">
                  <li>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                      apps/nextjs/src/app/page.tsx
                    </code>
                    <span className="ml-2">- Main homepage (you're looking at it!)</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                      packages/db/src/schema.ts
                    </code>
                    <span className="ml-2">- Database schema with Drizzle ORM</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                      docker-compose.yml
                    </code>
                    <span className="ml-2">- Local development services (Postgres, MinIO, Mailpit)</span>
                  </li>
                </ul>
                <p className="pt-2 text-base">
                  Try creating a post below to test the full stack!
                </p>
                <div className="mt-6 space-y-2 border-t border-border/50 pt-4">
                  <h3 className="text-base font-semibold text-foreground">OAuth Authentication</h3>
                  <p className="text-sm">
                    If you plan to use OAuth providers (Google, GitHub, etc.), it's <strong>highly recommended</strong> to deploy the auth proxy. 
                    This gives you a stable callback URL that works across all environments.
                  </p>
                  <Link
                    href="https://github.com/Badbird5907/turbo-kit#3-deploy-the-auth-proxy-recommended"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="mt-2">
                      View Auth Proxy Setup Guide <ExternalLink className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-6 space-y-2 border-t border-border/50 pt-4">
                  <p className="text-sm">
                    For more detailed setup instructions and next steps, check out the full documentation.
                  </p>
                  <Link
                    href="https://turbo-kit.badbird.dev/docs/getting-started"
                    target="_blank"
                  >
                    <Button className="mt-2" variant="outline">
                      View Guide <ExternalLink className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto mb-16 max-w-3xl">
            <Card className="bg-card/50 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">New Post</CardTitle>
              </CardHeader>
              <CardContent>
                <CreatePostForm />
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Posts</h2>
              <div className="text-sm text-muted-foreground">
                Latest activity
              </div>
            </div>
            
            <div className="max-h-[600px] space-y-4 overflow-y-auto rounded-xl pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
              <Suspense
                fallback={
                  <div className="flex w-full flex-col gap-4">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                  </div>
                }
              >
                <PostList />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
