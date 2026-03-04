// Small helper types for Vite define() usage in the browser.
// We intentionally keep this minimal.

declare const process: {
  env: {
    GEMINI_API_KEY?: string;
  };
};
