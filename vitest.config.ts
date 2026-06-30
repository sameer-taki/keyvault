import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Crypto core tests run against Node's Web Crypto (globalThis.crypto),
    // which is the same primitive the browser uses.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
