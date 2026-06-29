import App from "./App";

// Debug: confirm the SDK is available before registering
const _sdk = (window as any).__HERMES_PLUGIN_SDK__;
if (!_sdk) {
  console.error("[llm-wiki] SDK not available at registration time");
}

try {
  if (window.__HERMES_PLUGINS__ && typeof window.__HERMES_PLUGINS__.register === "function") {
    window.__HERMES_PLUGINS__.register("llm-wiki", App);
    console.log("[llm-wiki] registered OK, React.createContext:", typeof _sdk?.React?.createContext);
  } else {
    console.error("[llm-wiki] __HERMES_PLUGINS__.register not available");
  }
} catch (e) {
  console.error("[llm-wiki] registration threw:", e);
}
