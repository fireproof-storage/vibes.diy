export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  // We ignore integration tests by default for normal test runs
  // but the test:integration script explicitly specifies this file,
  // which will override this pattern
  testPathIgnorePatterns: ["/node_modules/", "/test/integration.test.ts"],
  //collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts"],
  //coverageThreshold: {
  //  global: {
  //   branches: 55,
  //  functions: 80,
  //  lines: 65,
  //  statements: 65,
  //},
  //},
};
