import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        sourceType: "module",
        ecmaVersion: "latest"
      }
    },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/semi": "off",
      "semi": ["error", "always"],
      "@typescript-eslint/quotes": "off",
      "quotes": ["error", "double"],
      "@typescript-eslint/comma-dangle": "off",
      "comma-dangle": ["error", "only-multiline"]
    }
  }
];
