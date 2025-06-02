module.exports = {
  printWidth: 100, // Default is 80
  tabWidth: 2, // Default
  useTabs: false, // Default
  semi: true, // Default
  singleQuote: false, // Default is false, use double quotes
  quoteProps: "as-needed", // Default
  jsxSingleQuote: false, // Default
  trailingComma: "es5", // Default - Trailing commas where valid in ES5 (objects, arrays, etc.)
  bracketSpacing: true, // Default - Print spaces between brackets in object literals
  bracketSameLine: false, // Default - Put the `>` of a multi-line JSX element at the end of the last line
  arrowParens: "always", // Default - Always include parens. Example: `(x) => x`
  endOfLine: "lf", // Default is 'lf'
  // Optional: if you use Tailwind CSS and want Prettier to sort classes:
  // plugins: [require('prettier-plugin-tailwindcss')], // You'd need to pnpm add -D prettier-plugin-tailwindcss
};
