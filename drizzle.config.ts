import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./app/lib/db/out",
  schema: "./app/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
