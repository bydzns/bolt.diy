module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    project: "./tsconfig.json", // Important for type-aware linting rules
  },
  settings: {
    react: {
      version: "detect", // Automatically detect the React version
    },
    "import/resolver": {
      typescript: {}, // This helps eslint-plugin-import understand TypeScript paths
    },
  },
  env: {
    browser: true, // Enables browser globals like window and document
    node: true, // Enables Node.js global variables and Node.js scoping.
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from @typescript-eslint/eslint-plugin
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // Optional: more strict type-aware rules
    "plugin:react/recommended", // Uses the recommended rules from eslint-plugin-react
    "plugin:react-hooks/recommended", // Enforces Rules of Hooks
    "plugin:jsx-a11y/recommended", // Accessibility rules
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks", "jsx-a11y", "import", "prettier"],
  rules: {
    // Common overrides
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",

    // TypeScript specific rules
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-module-boundary-types": "off", // Can be useful but sometimes verbose
    "@typescript-eslint/no-explicit-any": "warn", // Avoid 'any' type

    // React specific rules
    "react/prop-types": "off", // Not needed with TypeScript
    "react/react-in-jsx-scope": "off", // No longer needed with new JSX transform

    // Import sorting (optional, but good practice)
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling", "index"],
          "object",
          "type",
        ],
        pathGroups: [
          {
            pattern: "react",
            group: "external",
            position: "before",
          },
          {
            pattern: "~/**",
            group: "internal",
          },
        ],
        pathGroupsExcludedImportTypes: ["react"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/no-unresolved": ["error", { ignore: ["^~/"] }], // Allow "~/" imports

    // Prettier
    "prettier/prettier": ["warn", {}, { usePrettierrc: true }],

    // Add any other project-specific rules here
  },
  ignorePatterns: [
    "node_modules/",
    "build/",
    "public/build/",
    "coverage/",
    "*.generated.ts",
    "vite.config.ts", // Often has specific configurations not fitting all lint rules
    "postcss.config.js",
    "tailwind.config.ts",
    "pg-migrate-config.js", // Config file, may not adhere to all linting rules
  ],
};
