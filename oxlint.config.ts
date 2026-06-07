import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "react",
    "react-perf",
    "oxc",
    "import",
    "jsx-a11y",
    "promise",
  ],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "warn",
  },
  env: {
    builtin: true,
    browser: true,
    es2020: true,
  },
  ignorePatterns: ["dist/**", "**/matchers.d.ts"],
  rules: {
    "react/react-in-jsx-scope": "off",
  },
});
