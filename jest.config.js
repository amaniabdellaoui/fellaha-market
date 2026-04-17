/** @type {import('jest').Config} */
export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
      },
    ],
  },
  // Treat .jsx as a valid extension
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  // Reset module registry before each test file so module-level state is fresh
  resetModules: true,
  // No additional setup files needed – @testing-library/jest-dom is not
  // required for this test suite (we don't render React components here).
};
