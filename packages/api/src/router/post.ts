import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@acme/db";
import { posts } from "@acme/db/schema";
import { CreatePostSchema } from "@acme/types";

import { protectedProcedure, publicProcedure } from "../trpc";

export const postRouter = {
  all: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.posts.findMany({
      orderBy: desc(posts.createdAt),
      limit: 10,
    });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cached = await ctx.redis.get(`turbo-kit:post:${input.id}`);
      if (cached) {
        return cached;
      }
      const post = await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.id),
      });
      if (post) {
        await ctx.redis.set(`turbo-kit:post:${input.id}`, post);
        await ctx.redis.expire(`turbo-kit:post:${input.id}`, 60 * 60 * 24);
      }
      return post;
    }),

  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(posts).values(input);
    }),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.db.delete(posts).where(eq(posts.id, input));
  }),
} satisfies TRPCRouterRecord;
