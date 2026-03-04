export {};

declare global {
  interface Window {
    electronAPI?: {
      getGeminiKey?: () => Promise<string>;
    };
  }
}
