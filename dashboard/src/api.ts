const PLUGIN = "/api/plugins/llm-wiki";

function getSDK() {
  return (window as any).__HERMES_PLUGIN_SDK__;
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const sdk = getSDK();
  if (sdk?.authedFetch) return sdk.authedFetch(url, init);
  return fetch(url, init);
}

export async function apiJSON<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const sdk = getSDK();
  if (sdk?.fetchJSON) return sdk.fetchJSON<T>(url, init) as Promise<T>;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Core wiki endpoints (served by plugin itself)
export const wiki = {
  stats: () => apiJSON<any>(`${PLUGIN}/stats`),
  index: () => apiJSON<any>(`${PLUGIN}/index`),
  cards: (params?: string) => apiJSON<any>(`${PLUGIN}/cards${params ? `?${params}` : ""}`),
  tars: {
    chat: (message: string, history: {role: string; content: string}[], lang: string) =>
      apiJSON<any>(`${PLUGIN}/tars/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, lang }),
      }),
  },
  mandalart: {
    list: () => apiJSON<any[]>(`${PLUGIN}/mandalart`),
    get: (id: string) => apiJSON<any>(`${PLUGIN}/mandalart/${id}`),
    create: (body: { title?: string; cells?: string[] }) => apiJSON<any>(`${PLUGIN}/mandalart`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    update: (id: string, body: { title?: string; cells?: string[] }) => apiJSON<any>(`${PLUGIN}/mandalart/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    delete: (id: string) => apiFetch(`${PLUGIN}/mandalart/${id}`, { method: "DELETE" }),
  },
  pages: (params?: string) => apiJSON<any>(`${PLUGIN}/pages${params ? `?${params}` : ""}`),
  page: (path: string) => apiJSON<any>(`${PLUGIN}/pages/${path}`),
  deletePage: (path: string) => apiFetch(`${PLUGIN}/pages/${encodeURIComponent(path)}`, { method: "DELETE" }),
  graph: () => apiJSON<any>(`${PLUGIN}/graph`),
  timeline: (limit = 20) => apiJSON<any>(`${PLUGIN}/timeline?limit=${limit}`),
  allTags: () => apiJSON<any[]>(`${PLUGIN}/all-tags`),
  tags: () => apiJSON<any>(`${PLUGIN}/tags`),
  validateTags: (tags: string) => apiJSON<any>(`${PLUGIN}/validate-tags?tags=${encodeURIComponent(tags)}`),
  importUrl: (body: object) => apiFetch(`${PLUGIN}/import-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
  uploadFile: (form: FormData, type = "auto", force: boolean | string = false) =>
    apiFetch(`${PLUGIN}/upload?type=${encodeURIComponent(String(type))}&force=${force}`, { method: "POST", body: form }),
  analysisProgress: (taskId: string) => apiJSON<any>(`${PLUGIN}/analysis-progress/${taskId}`),
};

// GitHub sync endpoints (plugin)
export const github = {
  status: () => apiJSON<any>(`${PLUGIN}/github/status`),
  saveConfig: (body: object) => apiJSON<any>(`${PLUGIN}/github/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
  push: (body: object) => apiJSON<any>(`${PLUGIN}/github/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
  pull: () => apiJSON<any>(`${PLUGIN}/github/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }),
};
