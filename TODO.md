# LLM-Wiki Plugin — 待處理事項

> 記錄時間：2026-06-29  
> 最後更新：2026-06-29  
> 狀態：P0~P2 技術債已清理，P3 觀察中，F1 新功能待開發

---

## ✅ 已完成

- **P0 #1** 刪除死碼（wiki_router.py + 8 個 web/src wiki 檔案）
- **P1 #2** plugin_api.py 頂部加入 hermes_cli 相依模組清單
- **P1 #3** npm run watch 已可用（package.json 已有 watch script）
- **P2 #4** vite build --watch 開發流程確認可用
- **P2 #5** 新增 WikiRefreshContext（plugin 內建 context，取代 prop drilling）
- **P2 #6** 新增 Markdown 元件（marked），WikiPageDetail 改用 Markdown 渲染
- **F1 #9** 關鍵字權重知識圖譜（節點大小=被引用次數，連線粗細=共享標籤數）
- **F1 #10** FIRE 四向表格（LLM 生成 Fact/Index/Relation/Encyclopedia，整合進頁面詳情）
- **F1 #11** HTML/JSON 匯出（Pages 頁加匯出按鈕，支援全部或指定頁面）

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

## 🔵 F1 — 新功能：高價值（直接延伸現有架構）

### 9. H 強化 — 關鍵字權重知識圖譜
**來源：** Hermes.md 功能圖 — H. Keyword Graph View  
**現況：** 圖只有 wikilink 連結，沒有權重差異。  
**目標：**
- 節點大小 = 被引用次數（越多人連到越大）
- 連線粗細 = 兩頁面共享標籤數量
- 視覺化快速判斷哪些頁面最重要

實作範圍：`WikiGraph.tsx`（前端）+ `/graph` API 回傳加上 `weight` 欄位（後端）

### 10. B — FIRE 四向表格生成
**來源：** Hermes.md 功能圖 — B. FIRE（Fact / Index / Relation / Encyclopedia）  
**現況：** 有標籤分類和 wikilink 關聯，但無結構化四向表格。  
**目標：** 對任一頁面自動生成 FIRE 摘要表，協助對文本做出向量分析方向的整理。

實作範圍：新增 `plugin_api.py` 的 `/pages/{path}/fire` endpoint + 新前端元件

### 11. E — Publish 匯出（HTML 優先）
**來源：** Hermes.md 功能圖 — E. Publish  
**現況：** 只能在 wiki 內瀏覽，無法匯出。  
**目標：**
- 選取頁面匯出為靜態 HTML（最先做）
- JSON bundle 匯出（供其他工具使用）
- PPT / EPUB（後期）

實作範圍：後端新增 `/export` endpoint + 前端匯出按鈕

---

## 🟣 F2 — 新功能：中價值（需要新 UI）

### 12. C — Hypercard 卡片視圖
**來源：** Hermes.md 功能圖 — C. Hypercard  
**目標：** 每篇文章自動轉成手機友善的單張永久卡片（約 300 字）
- 包含：標題 + 摘要 + 大綱（三段式）
- 適合快速瀏覽和行動裝置閱讀

實作範圍：新增 `WikiCard.tsx` 頁面 + 後端 `/pages/{path}/card` summary API

### 13. F — Luhmann 編號索引
**來源：** Hermes.md 功能圖 — F. Lumann（Luhmann Zettelkasten）  
**目標：** BIRD 編號原則，對知識庫建立可導覽的階層索引
- 按書籍/章節/關鍵字/人名層級自動編號
- 適合書籍、課程類型的 wiki 內容

實作範圍：設計編號規則 + 後端索引 API + 前端索引樹狀視圖

---

## ⬛ F3 — 新功能：低優先（架構差異大）

### 14. A — iMandalart 九宮格思維導圖
**來源：** Hermes.md 功能圖 — A. iMandalart  
**目標：** 純文字九宮格，可插入 Todo 和大綱  
**限制：** 需要全新的格狀編輯介面，與現有 wiki 架構差異最大。

### 15. D — Tars AI 對話夥伴
**來源：** Hermes.md 功能圖 — D. Tars  
**目標：** 與 wiki 內容對話、能指揮其他 Agents  
**限制：** 屬於 Hermes Agent 層，不是 wiki plugin 層，需要跨系統整合。

---

## 處理順序摘要

```
技術債優先，再接新功能：

P0 → P1(#2,3) → P2(#4,5,6) → P3(#7,8)
  → F1(#9,10,11) → F2(#12,13) → F3(#14,15)

立即：刪死碼
近期：模組相依說明 + 開發流程文件
中期：hot reload + refresh context + 設計一致性
長期：plugin 系統風險追蹤
新功能：關鍵字權重圖 → FIRE 表格 → HTML 匯出 → Hypercard → Luhmann 索引
```
