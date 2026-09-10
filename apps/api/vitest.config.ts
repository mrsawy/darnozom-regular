import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Money-sensitive integration tests hit the real DB and mutate rows; run
    // them serially so concurrent suites can't clobber each other's fixtures.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
