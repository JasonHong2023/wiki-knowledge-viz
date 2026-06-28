import App from "./App";

if (window.__HERMES_PLUGINS__ && typeof window.__HERMES_PLUGINS__.register === "function") {
  window.__HERMES_PLUGINS__.register("llm-wiki", App);
}
