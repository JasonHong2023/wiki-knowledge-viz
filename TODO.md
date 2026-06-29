# LLM-Wiki Plugin — 待處理事項

> 記錄時間：2026-06-29  
> 狀態：已完成外掛化重構，以下為後續待處理問題

---

## 🔴 P0 — 立即處理（影響開發正確性）

### 1. 刪除死碼（會造成開發混亂）
**問題：** 舊版 wiki 程式碼仍存在，開發者不知道要改哪個版本。  
**影響：** 改了沒作用，或改了錯誤的版本。

需刪除的檔案：
- `hermes_cli/wiki_router.py`（1679 行，已不被 import）
- `web/src/pages/WikiGitHub.tsx`
- `web/src/pages/WikiGraph.tsx`
- `web/src/pages/WikiOverview.tsx`
- `web/src/pages/WikiPageList.tsx`
- `web/src/pages/WikiUpload.tsx`
- `web/src/components/WikiNav.tsx`
- `web/src/components/WikiPageDetail.tsx`
- `web/src/components/TagManager.tsx`（若存在）
- `web/src/contexts/WikiRefreshContext.tsx`（若已無人 import）

---

## 🟠 P1 — 近期處理（影響維護穩定性）

### 2. hermes_cli 模組版本相依說明
**問題：** `plugin_api.py` 依賴 7 個 hermes_cli 內部模組，Hermes 升級後可能靜默壞掉。  
**影響：** 某次 Hermes 更新後 wiki 功能異常，難以追蹤原因。

待做：
- 在 `plugin_api.py` 頂部加入相依模組清單與最後驗證日期
- 在 `README.md` 的疑難排解加入「Hermes 升級後功能異常」的排查步驟
- 考慮加入啟動時的 import 驗證，友善提示缺少的模組

### 3. 開發流程說明文件
**問題：** 前端改動需在 `plugins/llm-wiki/dashboard/` 下 build，而非原本的 `web/`，容易搞混。  
**影響：** 改了程式碼卻沒效果，浪費時間。

待做：
- 在 `plugins/llm-wiki/` 加入 `DEVELOPMENT.md` 或 `CLAUDE.md`，說明正確的開發流程
- 考慮加入 `npm run dev`（watch mode）腳本加速前端開發迭代

---

## 🟡 P2 — 中期處理（影響開發體驗）

### 4. 前端開發缺乏 Hot Reload
**問題：** 每次前端改動都需手動 `npm run build`，沒有即時預覽。  
**影響：** 開發速度比改主 app 慢 3–5 倍。

待做：
- 在 `dashboard/package.json` 確認或新增 `dev` script（`vite build --watch`）
- 撰寫開發啟動流程說明

### 5. 跨頁面狀態同步改為 prop drilling
**問題：** 原本 `WikiRefreshContext` 廣播刷新已移除，現在每個元件靠 `onRefresh` prop 傳遞。  
**影響：** 未來加新頁面必須記得傳 `onRefresh`，容易漏掉造成資料不同步。

待做：
- 評估是否在 plugin 內建立簡易的 refresh context（不依賴 Hermes 主 app）

### 6. Plugin 前端與 Hermes 設計系統的一致性
**問題：** Plugin 是獨立 bundle，無法使用 Hermes 的 `@/components/Markdown` 等共享元件。  
**影響：** Hermes 若更新 UI 設計系統，plugin 外觀可能與主介面不一致。

待做：
- 定期比對 Hermes 的 CSS 變數是否有改動
- Markdown 渲染目前直接用原始文字，考慮加入輕量的 markdown parser（如 `marked`）

---

## 🟢 P3 — 長期優化（影響架構穩定性）

### 7. Plugin 系統穩定性風險
**問題：** 依賴 Hermes 的 `_mount_plugin_api_routes()`、`_discover_dashboard_plugins()` 內部 API。  
**影響：** Hermes 若重構 plugin 系統，外掛可能失效。

待做：
- 追蹤 Hermes 版本，每次大版本更新後測試 plugin 是否正常
- 記錄目前依賴的 Hermes 內部函數名稱，方便升級後快速定位問題

### 8. API URL Prefix 硬編碼
**問題：** 前端 `api.ts` 的 `PLUGIN = "/api/plugins/llm-wiki"` 若 Hermes 改 plugin mounting prefix 就全壞。  
**影響：** 低概率，但一旦發生所有 API 都失效。

待做：
- 考慮從 `window.__HERMES_PLUGIN_SDK__` 取得動態 prefix（若 SDK 有提供）

---

## 處理順序摘要

```
P0 → P1(#2) → P1(#3) → P2(#4) → P2(#5) → P2(#6) → P3(#7) → P3(#8)

立即：刪死碼
近期：模組相依說明 + 開發流程文件
中期：hot reload + refresh context + 設計一致性
長期：plugin 系統風險追蹤
```
