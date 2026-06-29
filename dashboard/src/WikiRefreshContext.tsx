import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface WikiRefreshContextValue {
  refreshKey: number;
  refresh: () => void;
}

const WikiRefreshContext = createContext<WikiRefreshContextValue>({
  refreshKey: 0,
  refresh: () => {},
});

export function WikiRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <WikiRefreshContext.Provider value={{ refreshKey, refresh }}>
      {children}
    </WikiRefreshContext.Provider>
  );
}

export function useWikiRefresh() {
  return useContext(WikiRefreshContext);
}
