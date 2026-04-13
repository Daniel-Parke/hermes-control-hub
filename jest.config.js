/* eslint-disable @typescript-eslint/no-require-imports -- Jest config is CommonJS */
const nextJest = require("next/jest.js");

const createJestConfig = nextJest({ dir: "./" });

const isCommercialSuite = process.env.JEST_SUITE === "commercial";

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
    "src/lib/mission-helpers.ts": {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "src/lib/utils.ts": {
      branches: 55,
      functions: 40,
      lines: 48,
      statements: 45,
    },
    "src/lib/hermes.ts": {
      branches: 35,
      functions: 60,
      lines: 50,
      statements: 50,
    },
  },
  ...(isCommercialSuite
    ? {
        testMatch: [
          "<rootDir>/src/__tests__/commercial/**/*.test.ts",
          "<rootDir>/src/__tests__/commercial/**/*.test.tsx",
        ],
      }
    : {
        testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
        testPathIgnorePatterns: [
          "/node_modules/",
          "/.next/",
          "<rootDir>/src/__tests__/commercial/",
        ],
      }),
};

module.exports = createJestConfig(config);
