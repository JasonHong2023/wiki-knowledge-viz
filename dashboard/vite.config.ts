import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // Classic JSX: compiles <X> → React.createElement(X, …)
      // so we can just alias "react" to the host SDK's React object.
      jsxRuntime: "classic",
    }),
  ],
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
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "__sdk_react",
          "react-dom": "__sdk_react",
        },
        // Expose the host's React as the global `React` variable that
        // classic JSX (React.createElement) expects.
        banner: `var __sdk_react = (window.__HERMES_PLUGIN_SDK__ && window.__HERMES_PLUGIN_SDK__.React) || {};
var React = __sdk_react;`,
      },
    },
  },
});
