import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // Relative posix path, resolved against this config file. An absolute
  // __dirname-joined path breaks drizzle-kit's glob matching on Windows
  // (backslashes are treated as escapes) and __dirname is undefined in ESM.
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
