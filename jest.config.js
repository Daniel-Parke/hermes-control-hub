/* eslint-disable @typescript-eslint/no-require-imports -- Jest config is CommonJS */
const nextJest = require("next/jest.js");

const createJestConfig = nextJest({ dir: "./" });

/** OSS export: community test surface is `src/__tests__/oss/**` only. */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/config/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/layout.tsx",
    "!src/**/page.tsx",
    "!src/app/**",
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testMatch: [
    "<rootDir>/src/__tests__/oss/**/*.test.ts",
    "<rootDir>/src/__tests__/oss/**/*.test.tsx",
  ],
};

module.exports = createJestConfig(config);
