import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['app/**/*.test.{js,ts}', 'src/**/*.test.{ts,tsx}']
  }
});
