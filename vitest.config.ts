import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Explicit origin so jsdom behaves like a normal localhost page.
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000/',
      },
    },
    // Installs a memory-backed localStorage (see file header comment).
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
