import * as schema from "@acme/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type Schema = typeof schema;

export type Post = typeof schema.posts.$inferSelect;
export const CreatePostSchema = createInsertSchema(schema.posts, {
    title: z.string().max(256),
    content: z.string().max(256),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});