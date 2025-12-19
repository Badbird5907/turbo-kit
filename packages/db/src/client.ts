import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL environment variable");
}

const client = postgres(process.env.POSTGRES_URL);

export const db = drizzle({
  client,
  schema,
  casing: "snake_case",
});
