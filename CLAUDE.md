# LLM-Wiki Plugin — 開發規則

> 這份文件是給 AI 助手（Claude Code）或新加入的開發者看的。  
> 所有規則都有原因，違反可能導致改了沒效果或靜默壞掉。

---

## 規則一：前端一律在 plugin 目錄下改和 build

**正確路徑：** `plugins/llm-wiki/dashboard/src/`  
**錯誤路徑（勿動）：** `web/src/pages/Wiki*.tsx`、`web/src/components/Wiki*.tsx`

改完後必須執行：
```bash
cd ~/.hermes/hermes-agent/plugins/llm-wiki/dashboard && npm run build
```
然後重啟伺服器。不 build 直接看瀏覽器，看到的是舊版。

---

## 規則二：勿修改以下死碼檔案

以下檔案已不被任何程式碼 import，修改後不會有任何效果：

- `hermes_cli/wiki_router.py`
- `web/src/pages/WikiGitHub.tsx`
- `web/src/pages/WikiGraph.tsx`
- `web/src/pages/WikiOverview.tsx`
- `web/src/pages/WikiPageList.tsx`
- `web/src/pages/WikiUpload.tsx`
- `web/src/components/WikiNav.tsx`
- `web/src/components/WikiPageDetail.tsx`

這些檔案待刪除（見 TODO.md P0 #1），尚未清理前請忽略它們。

---

## 規則三：新增頁面時必須傳入 onRefresh prop

Plugin 內沒有全域 refresh context，各頁面靠 `onRefresh` prop 觸發資料更新。

新增任何會改動 wiki 資料的頁面或元件，必須：
1. 接收 `onRefresh: () => void` 作為 props
2. 在寫入操作（import / delete / upload）完成後呼叫 `onRefresh()`

漏傳會導致其他頁面資料不同步（不會報錯，只是靜默顯示舊資料）。

---

## 規則四：後端 API 路由前綴固定為 /api/plugins/llm-wiki

前端 `dashboard/src/api.ts` 第一行：
```typescript
const PLUGIN = "/api/plugins/llm-wiki";
```

`plugin_api.py` 內的路由是相對路徑（如 `/stats`），由 Hermes plugin 系統自動加上前綴。  
若要新增 API endpoint，只在 `plugin_api.py` 加路由即可，**不要修改 `PLUGIN` 常數**。

---

## 規則五：hermes_cli 模組有相依，升級 Hermes 後需驗證

`plugin_api.py` 依賴以下 hermes_cli 內部模組：
```
wiki_parser.py、wiki_parser_extensions.py、content_extractor.py
content_tag_analyzer.py、language_detector.py
tag_registry_updater.py、analysis_tracker.py
```

Hermes 主程式升級後，若 wiki 功能異常，優先檢查這 7 個模組的 API 是否改變（import 失敗或函數簽名不同）。

---

## 規則六：修改後必須重啟伺服器

- 修改 `plugin_api.py`（後端）→ 重啟伺服器
- 修改 `dashboard/src/`（前端）→ npm build → 重啟伺服器
- 瀏覽器需按 **Ctrl+Shift+R** 強制清除快取

重啟指令：
```bash
kill -9 $(lsof -i :9119 -t 2>/dev/null) 2>/dev/null; sleep 1
cd ~/.hermes/hermes-agent && WIKI_PATH=/home/jason_hong/wiki \
  nohup python -m uvicorn hermes_cli.web_server:app --host 127.0.0.1 --port 9119 \
  > /tmp/hermes.log 2>&1 &
```
