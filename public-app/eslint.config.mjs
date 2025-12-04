import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const disabledReactCompilerRules = {
  "react-hooks/component-hook-factories": "off",
  "react-hooks/config": "off",
  "react-hooks/error-boundaries": "off",
  "react-hooks/gating": "off",
  "react-hooks/globals": "off",
  "react-hooks/immutability": "off",
  "react-hooks/incompatible-library": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/purity": "off",
  "react-hooks/refs": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/set-state-in-render": "off",
  "react-hooks/static-components": "off",
  "react-hooks/unsupported-syntax": "off",
  "react-hooks/use-memo": "off",
};

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "setup-stripe.js", // Node.js script that uses require()
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      ...disabledReactCompilerRules,
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "react/no-unescaped-entities": "off", // Disable apostrophe escaping requirement
    },
  },
];

export default eslintConfig;
