import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["iife"],
      name: "_HermesLLMWiki",
      fileName: () => "index.js",
    },
    outDir: "dist",
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
      output: {
        globals: {
          react: "__sdk_react",
          "react/jsx-runtime": "__sdk_jsx",
          "react-dom": "__sdk_react",
        },
        banner: `var __sdk_react = (window.__HERMES_PLUGIN_SDK__ && window.__HERMES_PLUGIN_SDK__.React) || {};
var __sdk_jsx = {
  jsx: __sdk_react.createElement,
  jsxs: __sdk_react.createElement,
  Fragment: __sdk_react.Fragment,
};`,
      },
    },
  },
});
